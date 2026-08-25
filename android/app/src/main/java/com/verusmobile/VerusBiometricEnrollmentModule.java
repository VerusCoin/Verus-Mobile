package com.verusmobile;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.KeyProperties;
import android.security.keystore.UserNotAuthenticatedException;
import android.util.Base64;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import androidx.fragment.app.FragmentManager;
import androidx.lifecycle.Lifecycle;
import androidx.lifecycle.LifecycleEventObserver;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.security.Key;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.MGF1ParameterSpec;
import java.util.Arrays;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;

import javax.crypto.Cipher;
import javax.crypto.spec.OAEPParameterSpec;
import javax.crypto.spec.PSource;

/**
 * Stores the biometric-vault wrapping credential behind an auth-per-use
 * Android Keystore key. The alias is deliberately app-owned and cannot be
 * supplied over the React Native bridge.
 *
 * <p>The previous react-native-keychain Android storage permitted a successful
 * authentication to be reused for five seconds. Passing this module's decrypt
 * Cipher as BiometricPrompt.CryptoObject instead binds every credential read to
 * the prompt that immediately precedes it. The private key is also permanently
 * invalidated when the enrolled strong-biometric set changes.</p>
 */
public class VerusBiometricEnrollmentModule extends ReactContextBaseJavaModule {
  private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
  private static final String KEY_ALIAS =
    "Verus_Mobile_BiometricEnrollmentBoundVaultV3";
  private static final String PREFERENCES_NAME =
    "VerusBiometricEnrollmentBoundVaultV3";
  private static final String CREDENTIAL_CIPHERTEXT = "credentialCiphertext";
  private static final String CIPHER_TRANSFORMATION =
    "RSA/ECB/OAEPPadding";
  private static final int RSA_KEY_SIZE_BITS = 2048;
  private static final int RSA_CIPHERTEXT_BYTE_LENGTH = RSA_KEY_SIZE_BITS / 8;
  private static final int CREDENTIAL_BYTE_LENGTH = 128;
  private static final int CREDENTIAL_BASE64_LENGTH = 172;
  private static final long AUTHENTICATION_WATCHDOG_MS = 120_000L;
  private static final OAEPParameterSpec OAEP_PARAMETERS = new OAEPParameterSpec(
    "SHA-256",
    "MGF1",
    MGF1ParameterSpec.SHA1,
    PSource.PSpecified.DEFAULT
  );

  private static final String STATUS_VALID = "VALID";
  private static final String STATUS_MISSING = "MISSING";
  private static final String STATUS_INVALIDATED = "INVALIDATED";

  private final ReactApplicationContext reactContext;
  private final Object credentialStateLock = new Object();
  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private long credentialGeneration = 0;
  private PendingAuthentication activeAuthentication;

  private final class PendingAuthentication {
    final FragmentActivity activity;
    final Promise promise;
    final String encodedCiphertext;
    final long generation;
    volatile Cipher expectedCipher;
    final AtomicBoolean clientSettled = new AtomicBoolean(false);
    final AtomicBoolean terminalCallbackReceived = new AtomicBoolean(false);
    volatile BiometricPrompt prompt;
    volatile LifecycleEventObserver lifecycleObserver;
    volatile Runnable timeoutRunnable;
    volatile boolean promptLaunchAttempted;
    volatile boolean cancellationRequested;

    PendingAuthentication(
      FragmentActivity activity,
      Promise promise,
      String encodedCiphertext,
      long generation,
      Cipher expectedCipher
    ) {
      this.activity = activity;
      this.promise = promise;
      this.encodedCiphertext = encodedCiphertext;
      this.generation = generation;
      this.expectedCipher = expectedCipher;
    }
  }

  private static final class InvalidCredentialStateException
    extends Exception {
    InvalidCredentialStateException(String message) {
      super(message);
    }

    InvalidCredentialStateException(String message, Throwable cause) {
      super(message, cause);
    }
  }

  /** Keeps API-31 symbols out of verification paths on Android 7-11. */
  @RequiresApi(Build.VERSION_CODES.S)
  private static class Api31Impl {
    static boolean isBackendBusy(Throwable error) {
      return error instanceof android.security.keystore.BackendBusyException;
    }
  }

  /** Keeps API-33 methods out of verification paths on Android 7-12L. */
  @RequiresApi(Build.VERSION_CODES.TIRAMISU)
  private static class Api33Impl {
    static boolean isTransientKeyStoreFailure(Throwable error) {
      return
        error instanceof android.security.KeyStoreException &&
        ((android.security.KeyStoreException) error).isTransientFailure();
    }
  }

  /** Keeps the API-35 MGF1 authorization method off older verifier paths. */
  @RequiresApi(Build.VERSION_CODES.VANILLA_ICE_CREAM)
  private static class Api35Impl {
    static void authorizeSha1Mgf1(KeyGenParameterSpec.Builder builder) {
      builder.setMgf1Digests(KeyProperties.DIGEST_SHA1);
    }
  }

  VerusBiometricEnrollmentModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
  }

  @NonNull
  @Override
  public String getName() {
    return "VerusBiometricEnrollment";
  }

  private KeyStore loadKeyStore() throws Exception {
    KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
    keyStore.load(null);
    return keyStore;
  }

  private SharedPreferences preferences() {
    return reactContext.getSharedPreferences(
      PREFERENCES_NAME,
      Context.MODE_PRIVATE
    );
  }

  static byte[] decodeCanonicalCredential(String value) {
    if (value == null || value.length() != CREDENTIAL_BASE64_LENGTH) {
      throw new IllegalArgumentException(
        "Biometric credential must be canonical Base64 for exactly 128 bytes."
      );
    }

    final byte[] decoded;
    try {
      decoded = Base64.decode(value, Base64.NO_WRAP);
    } catch (IllegalArgumentException error) {
      throw new IllegalArgumentException(
        "Biometric credential is not canonical Base64.",
        error
      );
    }

    if (
      decoded.length != CREDENTIAL_BYTE_LENGTH ||
      !Base64.encodeToString(decoded, Base64.NO_WRAP).equals(value)
    ) {
      throw new IllegalArgumentException(
        "Biometric credential must be canonical Base64 for exactly 128 bytes."
      );
    }
    return decoded;
  }

  static byte[] decodeCanonicalCiphertext(String encoded)
    throws InvalidCredentialStateException {
    if (encoded == null) return null;

    final byte[] decoded;
    try {
      decoded = Base64.decode(encoded, Base64.NO_WRAP);
    } catch (IllegalArgumentException error) {
      throw new InvalidCredentialStateException(
        "Biometric credential ciphertext is not canonical Base64.",
        error
      );
    }

    if (
      decoded.length != RSA_CIPHERTEXT_BYTE_LENGTH ||
      !Base64.encodeToString(decoded, Base64.NO_WRAP).equals(encoded)
    ) {
      throw new InvalidCredentialStateException(
        "Biometric credential ciphertext has an invalid representation."
      );
    }
    return decoded;
  }

  private String readCanonicalCiphertext(SharedPreferences credentialPreferences)
    throws InvalidCredentialStateException {
    final Object stored;
    try {
      stored = credentialPreferences.getAll().get(CREDENTIAL_CIPHERTEXT);
    } catch (Throwable error) {
      throw new InvalidCredentialStateException(
        "Unable to read biometric credential ciphertext.",
        error
      );
    }

    if (stored == null) return null;
    if (!(stored instanceof String)) {
      throw new InvalidCredentialStateException(
        "Biometric credential ciphertext has an invalid storage type."
      );
    }

    String encoded = (String) stored;
    decodeCanonicalCiphertext(encoded);
    return encoded;
  }

  static Cipher initializeOaepCipher(int mode, Key key) throws Exception {
    Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
    cipher.init(mode, key, OAEP_PARAMETERS);
    return cipher;
  }

  private boolean wasPermanentlyInvalidated(Throwable error) {
    Throwable current = error;
    while (current != null) {
      if (current instanceof KeyPermanentlyInvalidatedException) return true;
      current = current.getCause();
    }
    return false;
  }

  private boolean isRetryableKeystoreFailure(Throwable error) {
    Throwable current = error;
    while (current != null) {
      if (
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
        Api31Impl.isBackendBusy(current)
      ) {
        return true;
      }

      if (
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        Api33Impl.isTransientKeyStoreFailure(current)
      ) {
        return true;
      }

      current = current.getCause();
    }
    return false;
  }

  private void rejectKeystoreFailure(
    Promise promise,
    String operation,
    Throwable error
  ) {
    if (isRetryableKeystoreFailure(error)) {
      promise.reject(
        "E_BIOMETRIC_ENROLLMENT_KEY_RETRYABLE",
        "Android Keystore is temporarily unavailable; retry biometric authentication.",
        error
      );
    } else {
      promise.reject(
        "E_BIOMETRIC_ENROLLMENT_KEY_" + operation,
        "Unable to access the enrollment-bound biometric credential.",
        error
      );
    }
  }

  private void deleteKeyAndCredential() throws Exception {
    KeyStore keyStore = loadKeyStore();
    if (keyStore.containsAlias(KEY_ALIAS)) keyStore.deleteEntry(KEY_ALIAS);
    if (!preferences().edit().remove(CREDENTIAL_CIPHERTEXT).commit()) {
      throw new IllegalStateException(
        "Unable to persist removal of biometric credential ciphertext."
      );
    }
  }

  private PrivateKey getPrivateKey(KeyStore keyStore) throws Exception {
    return (PrivateKey) keyStore.getKey(KEY_ALIAS, null);
  }

  private Cipher initializeDecryptCipher(PrivateKey privateKey) throws Exception {
    return initializeOaepCipher(Cipher.DECRYPT_MODE, privateKey);
  }

  /**
   * Returns VALID, MISSING, or INVALIDATED. Retryable/unknown Keystore errors
   * reject with a typed code and never delete either ciphertext or vault data.
   */
  @ReactMethod
  public void getEnrollmentBoundCredentialStatus(Promise promise) {
    synchronized (credentialStateLock) {
      try {
        KeyStore keyStore = loadKeyStore();
        String encoded;
        try {
          encoded = readCanonicalCiphertext(preferences());
        } catch (InvalidCredentialStateException error) {
          promise.resolve(STATUS_INVALIDATED);
          return;
        }

        if (!keyStore.containsAlias(KEY_ALIAS)) {
          promise.resolve(encoded == null ? STATUS_MISSING : STATUS_INVALIDATED);
          return;
        }

        if (encoded == null) {
          promise.resolve(STATUS_MISSING);
          return;
        }

        PrivateKey privateKey = getPrivateKey(keyStore);
        if (privateKey == null) {
          promise.resolve(STATUS_INVALIDATED);
          return;
        }

        try {
          // Initialization detects enrollment invalidation without consuming an
          // authentication. The actual read below uses a prompt-bound CryptoObject.
          initializeDecryptCipher(privateKey);
          promise.resolve(STATUS_VALID);
        } catch (UserNotAuthenticatedException error) {
          promise.resolve(STATUS_VALID);
        } catch (Throwable error) {
          if (wasPermanentlyInvalidated(error)) {
            promise.resolve(STATUS_INVALIDATED);
          } else {
            throw error;
          }
        }
      } catch (Throwable error) {
        if (wasPermanentlyInvalidated(error)) {
          promise.resolve(STATUS_INVALIDATED);
        } else {
          rejectKeystoreFailure(promise, "CHECK", error);
        }
      }
    }
  }

  /**
   * Creates the wrapped credential only when no usable one exists. Encryption
   * uses only the public key; every later private-key decrypt still requires a
   * fresh strong biometric authentication.
   */
  @ReactMethod
  public void setEnrollmentBoundCredential(String value, Promise promise) {
    synchronized (credentialStateLock) {
      byte[] credentialBytes = null;
      try {
        if (activeAuthentication != null) {
          promise.reject(
            "E_BIOMETRIC_OPERATION_IN_PROGRESS",
            "Biometric authentication is in progress or still cancelling."
          );
          return;
        }

        // Validate before loading/deleting the existing alias: malformed bridge
        // input must never make an established vault unrecoverable.
        credentialBytes = decodeCanonicalCredential(value);

        KeyStore keyStore = loadKeyStore();
        SharedPreferences credentialPreferences = preferences();
        boolean hasAlias = keyStore.containsAlias(KEY_ALIAS);
        boolean hasCiphertext = credentialPreferences.contains(
          CREDENTIAL_CIPHERTEXT
        );
        boolean hasCanonicalCiphertext = false;
        if (hasCiphertext) {
          try {
            hasCanonicalCiphertext =
              readCanonicalCiphertext(credentialPreferences) != null;
          } catch (InvalidCredentialStateException ignored) {
            // A malformed or wrong-type local record cannot be decrypted. It is
            // safe to replace only because the caller supplied a new credential.
          }
        }

        if (hasAlias && hasCanonicalCiphertext) {
          try {
            PrivateKey existingKey = getPrivateKey(keyStore);
            if (existingKey != null) {
              initializeDecryptCipher(existingKey);
              promise.reject(
                "E_BIOMETRIC_ENROLLMENT_KEY_ALREADY_EXISTS",
                "An enrollment-bound biometric credential already exists."
              );
              return;
            }
          } catch (UserNotAuthenticatedException error) {
            // Some providers require authentication while initializing. That is
            // still a usable key, so it must never be replaced here.
            promise.reject(
              "E_BIOMETRIC_ENROLLMENT_KEY_ALREADY_EXISTS",
              "An enrollment-bound biometric credential already exists.",
              error
            );
            return;
          } catch (Throwable error) {
            if (!wasPermanentlyInvalidated(error)) {
              // Unknown and transient failures preserve the existing key and
              // ciphertext. A retry is safer than destroying a recoverable vault.
              throw error;
            }
          }
        }

        // Any state reaching this point is either incomplete, malformed, or
        // permanently invalidated. Remove the ciphertext first; if persistence
        // fails, leave the old alias untouched and fail closed.
        if (
          hasCiphertext &&
          !credentialPreferences.edit().remove(CREDENTIAL_CIPHERTEXT).commit()
        ) {
          throw new IllegalStateException(
            "Unable to clear an invalid biometric credential ciphertext."
          );
        }
        if (hasAlias) keyStore.deleteEntry(KEY_ALIAS);
        credentialGeneration++;

        KeyGenParameterSpec.Builder builder = new KeyGenParameterSpec.Builder(
          KEY_ALIAS,
          KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
          .setKeySize(RSA_KEY_SIZE_BITS)
          .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_RSA_OAEP)
          .setDigests(KeyProperties.DIGEST_SHA256)
          .setUserAuthenticationRequired(true)
          .setInvalidatedByBiometricEnrollment(true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
          Api35Impl.authorizeSha1Mgf1(builder);
        }

        // Device credentials are deliberately excluded. Per-use authentication
        // is required for enrollment invalidation on Android 7-10 as well.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          builder.setUserAuthenticationParameters(
            0,
            KeyProperties.AUTH_BIOMETRIC_STRONG
          );
        } else {
          builder.setUserAuthenticationValidityDurationSeconds(-1);
        }

        KeyPairGenerator generator = KeyPairGenerator.getInstance(
          KeyProperties.KEY_ALGORITHM_RSA,
          ANDROID_KEYSTORE
        );
        generator.initialize(builder.build());
        generator.generateKeyPair();

        PublicKey publicKey = loadKeyStore()
          .getCertificate(KEY_ALIAS)
          .getPublicKey();
        byte[] encrypted = initializeOaepCipher(
          Cipher.ENCRYPT_MODE,
          publicKey
        ).doFinal(credentialBytes);
        String encoded = Base64.encodeToString(encrypted, Base64.NO_WRAP);

        if (
          !credentialPreferences
            .edit()
            .putString(CREDENTIAL_CIPHERTEXT, encoded)
            .commit()
        ) {
          try {
            loadKeyStore().deleteEntry(KEY_ALIAS);
          } catch (Throwable ignored) {}
          throw new IllegalStateException(
            "Unable to persist biometric credential ciphertext."
          );
        }

        promise.resolve(true);
      } catch (Throwable error) {
        rejectKeystoreFailure(promise, "CREATE", error);
      } finally {
        if (credentialBytes != null) {
          Arrays.fill(credentialBytes, (byte) 0);
        }
      }
    }
  }

  private boolean isPendingAuthenticationActive(
    PendingAuthentication pending
  ) {
    synchronized (credentialStateLock) {
      return
        activeAuthentication == pending &&
        !pending.clientSettled.get() &&
        !pending.terminalCallbackReceived.get();
    }
  }

  private void stopAuthenticationWatchdog(PendingAuthentication pending) {
    final Runnable timeoutRunnable;
    synchronized (credentialStateLock) {
      timeoutRunnable = pending.timeoutRunnable;
      pending.timeoutRunnable = null;
    }
    if (timeoutRunnable != null) {
      mainHandler.removeCallbacks(timeoutRunnable);
    }
  }

  /**
   * Releases references only after AndroidX has delivered its terminal callback,
   * or when authentication was proven never to have been launched.
   */
  private void cleanupFinishedAuthentication(PendingAuthentication pending) {
    stopAuthenticationWatchdog(pending);
    Executor executor = ContextCompat.getMainExecutor(reactContext);
    executor.execute(() -> {
      final LifecycleEventObserver observer;
      synchronized (credentialStateLock) {
        observer = pending.lifecycleObserver;
        pending.lifecycleObserver = null;
        pending.prompt = null;
        pending.expectedCipher = null;
      }
      if (observer != null) {
        pending.activity.getLifecycle().removeObserver(observer);
      }
    });
  }

  /**
   * Requests cancellation without releasing the Activity-wide AndroidX slot.
   * Biometric 1.1.0 does not clear its retained prompt/awaiting state until a
   * terminal callback, so allowing a replacement earlier can misattribute the
   * old result to the replacement callback.
   */
  private void requestPromptCancellation(PendingAuthentication pending) {
    stopAuthenticationWatchdog(pending);
    Executor executor = ContextCompat.getMainExecutor(reactContext);
    executor.execute(() -> {
      final BiometricPrompt prompt;
      synchronized (credentialStateLock) {
        if (
          pending.terminalCallbackReceived.get() ||
          !pending.promptLaunchAttempted ||
          pending.cancellationRequested
        ) {
          return;
        }
        pending.cancellationRequested = true;
        prompt = pending.prompt;
      }

      if (prompt != null) {
        try {
          prompt.cancelAuthentication();
        } catch (Throwable ignored) {
          // Fail closed: without a terminal callback this module retains the
          // prompt slot, rather than letting a new request inherit stale state.
        }
      }
    });
  }

  private void rejectPendingAuthentication(
    PendingAuthentication pending,
    String code,
    String message,
    Throwable error,
    boolean cancelPrompt
  ) {
    boolean didSettle = false;
    boolean waitForTerminalCallback = false;
    synchronized (credentialStateLock) {
      if (pending.clientSettled.compareAndSet(false, true)) {
        if (error == null) pending.promise.reject(code, message);
        else pending.promise.reject(code, message, error);
        didSettle = true;

        waitForTerminalCallback = pending.promptLaunchAttempted;
        if (!waitForTerminalCallback) {
          pending.terminalCallbackReceived.set(true);
          if (activeAuthentication == pending) activeAuthentication = null;
        }
      }
    }
    if (!didSettle) return;

    if (waitForTerminalCallback) {
      stopAuthenticationWatchdog(pending);
      if (cancelPrompt) requestPromptCancellation(pending);
    } else {
      cleanupFinishedAuthentication(pending);
    }
  }

  private void handleAuthenticationError(
    PendingAuthentication pending,
    int errorCode,
    @NonNull CharSequence errorString
  ) {
    String code;
    if (
      errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON ||
      errorCode == BiometricPrompt.ERROR_USER_CANCELED ||
      errorCode == BiometricPrompt.ERROR_CANCELED
    ) {
      code = "E_BIOMETRIC_AUTH_CANCELLED";
    } else if (errorCode == BiometricPrompt.ERROR_LOCKOUT_PERMANENT) {
      // A permanent lockout requires device-credential recovery; an immediate
      // biometric retry cannot clear it. The encrypted vault remains untouched.
      code = "E_BIOMETRIC_AUTH_PERMANENT_LOCKOUT";
    } else if (
      errorCode == BiometricPrompt.ERROR_HW_UNAVAILABLE ||
      errorCode == BiometricPrompt.ERROR_UNABLE_TO_PROCESS ||
      errorCode == BiometricPrompt.ERROR_TIMEOUT ||
      errorCode == BiometricPrompt.ERROR_LOCKOUT
    ) {
      code = "E_BIOMETRIC_AUTH_RETRYABLE";
    } else {
      code = "E_BIOMETRIC_AUTH_FAILED";
    }

    boolean didReceiveTerminalCallback = false;
    synchronized (credentialStateLock) {
      if (pending.terminalCallbackReceived.compareAndSet(false, true)) {
        didReceiveTerminalCallback = true;
        if (pending.clientSettled.compareAndSet(false, true)) {
          pending.promise.reject(code, errorString.toString());
        }
        if (activeAuthentication == pending) activeAuthentication = null;
      }
    }
    if (didReceiveTerminalCallback) cleanupFinishedAuthentication(pending);
  }

  /**
   * Final Activity destruction is a safe non-callback terminal boundary. A
   * configuration change is not: AndroidX retains its prompt/ViewModel across
   * recreation, so keep draining until its terminal callback arrives.
   */
  private void handleAuthenticationActivityDestroyed(
    PendingAuthentication pending
  ) {
    if (pending.activity.isChangingConfigurations()) {
      rejectPendingAuthentication(
        pending,
        "E_BIOMETRIC_ACTIVITY_UNAVAILABLE",
        "Biometric authentication was cancelled while the wallet screen changed.",
        null,
        true
      );
      return;
    }

    final BiometricPrompt prompt;
    boolean didTerminate = false;
    synchronized (credentialStateLock) {
      if (pending.terminalCallbackReceived.compareAndSet(false, true)) {
        didTerminate = true;
        if (pending.clientSettled.compareAndSet(false, true)) {
          pending.promise.reject(
            "E_BIOMETRIC_ACTIVITY_UNAVAILABLE",
            "The wallet screen closed during biometric authentication."
          );
        }
        prompt = pending.prompt;
        if (activeAuthentication == pending) activeAuthentication = null;
      } else {
        prompt = null;
      }
    }

    if (!didTerminate) return;
    if (prompt != null) {
      try {
        prompt.cancelAuthentication();
      } catch (Throwable ignored) {}
    }
    cleanupFinishedAuthentication(pending);
  }

  /**
   * AndroidX Biometric 1.1.0 cancels its hidden fragment automatically from
   * onStop() only on API levels below 29. Settle the bridge caller when the
   * wallet is backgrounded on every supported API, but retain this module's
   * prompt slot until AndroidX delivers a terminal callback (or ON_DESTROY
   * supplies the safe terminal boundary above).
   */
  private void handleAuthenticationActivityStopped(
    PendingAuthentication pending
  ) {
    rejectPendingAuthentication(
      pending,
      "E_BIOMETRIC_ACTIVITY_UNAVAILABLE",
      "Biometric authentication was cancelled because the wallet left the foreground.",
      null,
      true
    );
  }

  private void handleAuthenticationSuccess(
    PendingAuthentication pending,
    @NonNull BiometricPrompt.AuthenticationResult result
  ) {
    boolean didReceiveTerminalCallback = false;
    try {
      synchronized (credentialStateLock) {
        if (!pending.terminalCallbackReceived.compareAndSet(false, true)) return;
        didReceiveTerminalCallback = true;
        try {
          // A locally cancelled/timed-out operation may still race with a success.
          // It drains the AndroidX slot but must never resolve its caller.
          if (!pending.clientSettled.compareAndSet(false, true)) return;

          BiometricPrompt.CryptoObject cryptoObject = result.getCryptoObject();
          Cipher authenticatedCipher =
            cryptoObject == null ? null : cryptoObject.getCipher();
          if (
            authenticatedCipher == null ||
            authenticatedCipher != pending.expectedCipher
          ) {
            pending.promise.reject(
              "E_BIOMETRIC_AUTH_OPERATION_MISMATCH",
              "Biometric authentication returned a different cryptographic operation."
            );
            return;
          }

          // Removal or replacement linearizes by changing this generation under
          // the same lock. Once either reports success, this path can no longer
          // resolve a credential from an earlier CryptoObject operation.
          if (pending.generation != credentialGeneration) {
            pending.promise.reject(
              "E_BIOMETRIC_CREDENTIAL_REMOVED",
              "The biometric credential was removed during authentication."
            );
            return;
          }

          String currentCiphertext = readCanonicalCiphertext(preferences());
          if (!pending.encodedCiphertext.equals(currentCiphertext)) {
            pending.promise.reject(
              "E_BIOMETRIC_ENROLLMENT_CHANGED",
              "The enrollment-bound biometric credential changed during authentication."
            );
            return;
          }

          byte[] decrypted = authenticatedCipher.doFinal(
            decodeCanonicalCiphertext(pending.encodedCiphertext)
          );
          try {
            if (decrypted.length != CREDENTIAL_BYTE_LENGTH) {
              throw new InvalidCredentialStateException(
                "Decrypted biometric credential has an invalid length."
              );
            }
            String credential = Base64.encodeToString(
              decrypted,
              Base64.NO_WRAP
            );
            pending.promise.resolve(credential);
          } finally {
            Arrays.fill(decrypted, (byte) 0);
          }
        } catch (Throwable error) {
          if (wasPermanentlyInvalidated(error)) {
            pending.promise.reject(
              "E_BIOMETRIC_ENROLLMENT_CHANGED",
              "The enrolled biometric set changed.",
              error
            );
          } else {
            pending.promise.reject(
              "E_BIOMETRIC_CREDENTIAL_DECRYPT",
              "Unable to decrypt the biometric credential.",
              error
            );
          }
        } finally {
          if (activeAuthentication == pending) activeAuthentication = null;
        }
      }
    } finally {
      if (didReceiveTerminalCallback) cleanupFinishedAuthentication(pending);
    }
  }

  private void startBiometricAuthentication(
    PendingAuthentication pending,
    BiometricPrompt.PromptInfo promptInfo
  ) {
    Executor executor = ContextCompat.getMainExecutor(reactContext);
    pending.activity.runOnUiThread(() -> {
      if (!isPendingAuthenticationActive(pending)) return;

      FragmentManager fragmentManager = pending.activity
        .getSupportFragmentManager();
      if (
        pending.activity.isFinishing() ||
        pending.activity.isDestroyed() ||
        fragmentManager.isDestroyed() ||
        fragmentManager.isStateSaved() ||
        !pending.activity
          .getLifecycle()
          .getCurrentState()
          .isAtLeast(Lifecycle.State.RESUMED)
      ) {
        rejectPendingAuthentication(
          pending,
          "E_BIOMETRIC_ACTIVITY_UNAVAILABLE",
          "Biometric authentication requires an active wallet screen.",
          null,
          false
        );
        return;
      }

      BiometricPrompt.AuthenticationCallback callback =
        new BiometricPrompt.AuthenticationCallback() {
          @Override
          public void onAuthenticationError(
            int errorCode,
            @NonNull CharSequence errorString
          ) {
            handleAuthenticationError(pending, errorCode, errorString);
          }

          @Override
          public void onAuthenticationSucceeded(
            @NonNull BiometricPrompt.AuthenticationResult result
          ) {
            handleAuthenticationSuccess(pending, result);
          }
        };

      final LifecycleEventObserver observer = (source, event) -> {
        if (event == Lifecycle.Event.ON_STOP) {
          handleAuthenticationActivityStopped(pending);
        } else if (event == Lifecycle.Event.ON_DESTROY) {
          handleAuthenticationActivityDestroyed(pending);
        }
      };
      BiometricPrompt createdPrompt = null;
      Throwable startError = null;
      synchronized (credentialStateLock) {
        if (
          activeAuthentication != pending ||
          pending.clientSettled.get() ||
          pending.terminalCallbackReceived.get() ||
          fragmentManager.isDestroyed() ||
          fragmentManager.isStateSaved() ||
          !pending.activity
            .getLifecycle()
            .getCurrentState()
            .isAtLeast(Lifecycle.State.RESUMED)
        ) {
          // The operation was settled before any AndroidX launch; no drain is
          // needed and rejectPendingAuthentication will release the slot.
          startError = new IllegalStateException(
            "Biometric Activity became unavailable before prompt construction."
          );
        } else {
          try {
            createdPrompt = new BiometricPrompt(
              pending.activity,
              executor,
              callback
            );
            pending.activity.getLifecycle().addObserver(observer);
            pending.prompt = createdPrompt;
            pending.lifecycleObserver = observer;

            // This call and the final state-saved check execute in one main-loop
            // turn. AndroidX 1.1.0 otherwise logs and returns without a callback
            // when called after onSaveInstanceState().
            pending.promptLaunchAttempted = true;
            createdPrompt.authenticate(
              promptInfo,
              new BiometricPrompt.CryptoObject(pending.expectedCipher)
            );
            // Some implementations may deliver a terminal callback before
            // authenticate() returns. Do not resurrect its cleaned references or
            // leave an orphan watchdog after that synchronous completion.
            if (
              activeAuthentication == pending &&
              !pending.clientSettled.get() &&
              !pending.terminalCallbackReceived.get()
            ) {
              Runnable timeoutRunnable = () -> rejectPendingAuthentication(
                pending,
                "E_BIOMETRIC_AUTH_TIMEOUT",
                "Biometric authentication did not complete in time.",
                null,
                true
              );
              pending.timeoutRunnable = timeoutRunnable;
              if (
                !mainHandler.postDelayed(
                  timeoutRunnable,
                  AUTHENTICATION_WATCHDOG_MS
                )
              ) {
                pending.timeoutRunnable = null;
                throw new IllegalStateException(
                  "Unable to schedule biometric authentication watchdog."
                );
              }
            }
          } catch (Throwable error) {
            startError = error;
          }
        }
      }

      if (startError != null) {
        rejectPendingAuthentication(
          pending,
          "E_BIOMETRIC_PROMPT_START",
          "Unable to start biometric authentication.",
          startError,
          true
        );
      }
    });
  }

  /**
   * Reveals the wrapped credential only through the exact Cipher operation
   * authenticated by this prompt; there is no time-based authentication reuse.
   */
  @ReactMethod
  public void getEnrollmentBoundCredential(String title, Promise promise) {
    Activity currentActivity = getCurrentActivity();
    if (!(currentActivity instanceof FragmentActivity)) {
      promise.reject(
        "E_BIOMETRIC_ACTIVITY_UNAVAILABLE",
        "Biometric authentication requires an active wallet screen."
      );
      return;
    }

    FragmentActivity activity = (FragmentActivity) currentActivity;
    final Cipher decryptCipher;
    final PendingAuthentication pending;
    synchronized (credentialStateLock) {
      if (activeAuthentication != null) {
        promise.reject(
          "E_BIOMETRIC_AUTH_IN_PROGRESS",
          "Another biometric authentication is in progress or still cancelling."
        );
        return;
      }

      final String encoded;
      try {
        encoded = readCanonicalCiphertext(preferences());
      } catch (InvalidCredentialStateException error) {
        promise.reject(
          "E_BIOMETRIC_ENROLLMENT_CHANGED",
          "The enrollment-bound biometric credential is invalid.",
          error
        );
        return;
      }
      if (encoded == null) {
        promise.reject(
          "E_BIOMETRIC_ENROLLMENT_KEY_MISSING",
          "No enrollment-bound biometric credential is stored."
        );
        return;
      }

      try {
        KeyStore keyStore = loadKeyStore();
        if (!keyStore.containsAlias(KEY_ALIAS)) {
          promise.reject(
            "E_BIOMETRIC_ENROLLMENT_CHANGED",
            "The enrolled biometric set changed."
          );
          return;
        }

        PrivateKey privateKey = getPrivateKey(keyStore);
        if (privateKey == null) {
          promise.reject(
            "E_BIOMETRIC_ENROLLMENT_CHANGED",
            "The enrolled biometric set changed."
          );
          return;
        }
        decryptCipher = initializeDecryptCipher(privateKey);
      } catch (Throwable error) {
        if (wasPermanentlyInvalidated(error)) {
          promise.reject(
            "E_BIOMETRIC_ENROLLMENT_CHANGED",
            "The enrolled biometric set changed.",
            error
          );
        } else {
          rejectKeystoreFailure(promise, "READ", error);
        }
        return;
      }

      pending = new PendingAuthentication(
        activity,
        promise,
        encoded,
        credentialGeneration,
        decryptCipher
      );
      activeAuthentication = pending;
    }

    final BiometricPrompt.PromptInfo promptInfo;
    try {
      promptInfo = new BiometricPrompt.PromptInfo.Builder()
        .setTitle(
          title == null || title.trim().length() == 0
            ? "Authenticate wallet"
            : title
        )
        .setNegativeButtonText("Cancel")
        .setAllowedAuthenticators(
          BiometricManager.Authenticators.BIOMETRIC_STRONG
        )
        .setConfirmationRequired(true)
        .build();
      startBiometricAuthentication(pending, promptInfo);
    } catch (Throwable error) {
      rejectPendingAuthentication(
        pending,
        "E_BIOMETRIC_PROMPT_START",
        "Unable to start biometric authentication.",
        error,
        true
      );
    }
  }

  @Override
  public void invalidate() {
    final PendingAuthentication pendingToCancel;
    synchronized (credentialStateLock) {
      credentialGeneration++;
      pendingToCancel = activeAuthentication;
    }

    if (pendingToCancel != null) {
      rejectPendingAuthentication(
        pendingToCancel,
        "E_BIOMETRIC_MODULE_INVALIDATED",
        "Biometric authentication was cancelled because the wallet session closed.",
        null,
        true
      );
    }
    super.invalidate();
  }

  @ReactMethod
  public void removeEnrollmentBoundCredential(Promise promise) {
    final PendingAuthentication pendingToCancel;
    synchronized (credentialStateLock) {
      credentialGeneration++;
      pendingToCancel = activeAuthentication;

      try {
        deleteKeyAndCredential();
        promise.resolve(true);
      } catch (Throwable error) {
        rejectKeystoreFailure(promise, "REMOVE", error);
      }
    }

    if (pendingToCancel != null) {
      rejectPendingAuthentication(
        pendingToCancel,
        "E_BIOMETRIC_CREDENTIAL_REMOVED",
        "The biometric credential was removed during authentication.",
        null,
        true
      );
    }
  }
}
