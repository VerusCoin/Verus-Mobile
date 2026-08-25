import * as Keychain from 'react-native-keychain';
import {NativeModules, Platform} from 'react-native';
import {
  BIOMETRIC_ENROLLMENT_CHANGED_ERROR_CODE,
  BIOMETRIC_ENROLLMENT_PROTECTION_ERROR_CODE,
  BIOMETRIC_PASSWORD_NOT_FOUND_ERROR_CODE,
  getBiometricCredential,
  getLegacyBiometricData,
  getLegacyBiometricPassword,
  getPersistentCredential,
  saveNewPersistentCredential,
  setBiometricCredential,
  storeLegacyBiometricPassword,
} from '../../keychain/keychain';

const validBiometricCredential = Buffer.alloc(128, 7).toString('base64');

describe('persistent keychain credential', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    Keychain.getGenericPassword.mockReset();
    Keychain.setGenericPassword.mockReset();
    Keychain.resetGenericPassword.mockReset();

    Keychain.setGenericPassword.mockResolvedValue(true);
    Keychain.resetGenericPassword.mockResolvedValue(true);
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredentialStatus.mockReset();
    NativeModules.VerusBiometricEnrollment.setEnrollmentBoundCredential.mockReset();
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredential.mockReset();
    NativeModules.VerusBiometricEnrollment.removeEnrollmentBoundCredential.mockReset();
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredentialStatus.mockResolvedValue(
      'VALID',
    );
    NativeModules.VerusBiometricEnrollment.setEnrollmentBoundCredential.mockResolvedValue(
      true,
    );
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredential.mockResolvedValue(
      'existing-biometric-vault-key',
    );
    NativeModules.VerusBiometricEnrollment.removeEnrollmentBoundCredential.mockResolvedValue(
      true,
    );
    Platform.OS = originalPlatform;
  });

  afterAll(() => {
    Platform.OS = originalPlatform;
  });

  it('binds biometric credentials to the currently enrolled biometric set', async () => {
    await setBiometricCredential(validBiometricCredential);

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'Verus_Mobile',
      validBiometricCredential,
      {
        service: 'Verus_Mobile_BiometricCurrentSetV1',
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      },
    );
  });

  it('never reads the pre-current-set biometric credential service', async () => {
    Keychain.getGenericPassword.mockResolvedValue({
      password: 'existing-biometric-vault-key',
    });

    await expect(getBiometricCredential()).resolves.toBe(
      'existing-biometric-vault-key',
    );
    expect(Keychain.getGenericPassword).toHaveBeenCalledWith({
      service: 'Verus_Mobile_BiometricCurrentSetV1',
      authenticationPrompt: {title: 'Authenticate to retrieve password'},
    });
    expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
  });

  it('binds Android biometric credentials to an enrollment-invalidated Keystore key', async () => {
    Platform.OS = 'android';

    await setBiometricCredential(validBiometricCredential);

    expect(
      NativeModules.VerusBiometricEnrollment.setEnrollmentBoundCredential,
    ).toHaveBeenCalledWith(validBiometricCredential);
    expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
  });

  it('rejects malformed native credentials before touching the existing key', async () => {
    Platform.OS = 'android';

    await expect(setBiometricCredential('not-a-128-byte-key')).rejects.toThrow(
      'canonical Base64 for exactly 128 bytes',
    );

    expect(
      NativeModules.VerusBiometricEnrollment.setEnrollmentBoundCredential,
    ).not.toHaveBeenCalled();
    expect(
      NativeModules.VerusBiometricEnrollment.removeEnrollmentBoundCredential,
    ).not.toHaveBeenCalled();
  });

  it('refuses an Android vault after biometric enrollment changes', async () => {
    Platform.OS = 'android';
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredentialStatus.mockResolvedValue(
      'INVALIDATED',
    );

    await expect(getBiometricCredential()).rejects.toMatchObject({
      code: BIOMETRIC_ENROLLMENT_CHANGED_ERROR_CODE,
    });

    expect(Keychain.getGenericPassword).not.toHaveBeenCalled();
    expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();
    expect(
      NativeModules.VerusBiometricEnrollment.removeEnrollmentBoundCredential,
    ).not.toHaveBeenCalled();
  });

  it('fails closed when the Android enrollment module is missing', async () => {
    Platform.OS = 'android';
    const enrollmentModule = NativeModules.VerusBiometricEnrollment;
    delete NativeModules.VerusBiometricEnrollment;

    try {
      await expect(getBiometricCredential()).rejects.toMatchObject({
        code: BIOMETRIC_ENROLLMENT_PROTECTION_ERROR_CODE,
      });
      expect(Keychain.getGenericPassword).not.toHaveBeenCalled();
    } finally {
      NativeModules.VerusBiometricEnrollment = enrollmentModule;
    }
  });

  it('fails closed when Android cannot verify the enrollment key', async () => {
    Platform.OS = 'android';
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredentialStatus.mockRejectedValue(
      new Error('keystore unavailable'),
    );

    await expect(getBiometricCredential()).rejects.toMatchObject({
      code: BIOMETRIC_ENROLLMENT_PROTECTION_ERROR_CODE,
    });
    expect(Keychain.getGenericPassword).not.toHaveBeenCalled();
  });

  it('uses the Android prompt-bound native credential read', async () => {
    Platform.OS = 'android';

    await expect(getBiometricCredential()).resolves.toBe(
      'existing-biometric-vault-key',
    );

    expect(
      NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredentialStatus,
    ).toHaveBeenCalledTimes(1);
    expect(
      NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredential,
    ).toHaveBeenCalledWith('Authenticate to retrieve password');
    expect(Keychain.getGenericPassword).not.toHaveBeenCalled();
  });

  it('preserves typed transient Android authentication failures', async () => {
    Platform.OS = 'android';
    const transientError = Object.assign(new Error('backend busy'), {
      code: 'E_BIOMETRIC_ENROLLMENT_KEY_RETRYABLE',
    });
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredentialStatus.mockRejectedValue(
      transientError,
    );

    await expect(getBiometricCredential()).rejects.toMatchObject({
      code: BIOMETRIC_ENROLLMENT_PROTECTION_ERROR_CODE,
      cause: transientError,
    });
    expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();
    expect(
      NativeModules.VerusBiometricEnrollment.removeEnrollmentBoundCredential,
    ).not.toHaveBeenCalled();
  });

  it('stores iOS-style password maps in a versioned current-set service', async () => {
    Platform.OS = 'ios';
    Keychain.getGenericPassword.mockResolvedValue(false);

    await storeLegacyBiometricPassword('account-hash', 'wallet-password');

    expect(Keychain.getGenericPassword).toHaveBeenCalledWith({
      service: 'com.verus.verusmobile.biometric.currentset.v1',
      authenticationPrompt: {
        title: 'Authenticate to store password in biometric keychain',
      },
    });
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'Verus_Mobile',
      JSON.stringify({'account-hash': 'wallet-password'}),
      {
        service: 'com.verus.verusmobile.biometric.currentset.v1',
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      },
    );
  });

  it('reports a missing iOS biometric password for the selected account', async () => {
    Platform.OS = 'ios';
    Keychain.getGenericPassword
      .mockResolvedValueOnce({
        password: JSON.stringify({otherAccount: 'other-password'}),
      })
      .mockResolvedValueOnce(false);

    await expect(
      getLegacyBiometricPassword('selectedAccount'),
    ).rejects.toMatchObject({
      code: BIOMETRIC_PASSWORD_NOT_FOUND_ERROR_CODE,
      accountHash: 'selectedAccount',
    });
  });

  it('reports a missing iOS biometric password when both vault services are absent', async () => {
    Platform.OS = 'ios';
    Keychain.getGenericPassword.mockResolvedValue(false);

    await expect(
      getLegacyBiometricPassword('selectedAccount'),
    ).rejects.toMatchObject({
      code: BIOMETRIC_PASSWORD_NOT_FOUND_ERROR_CODE,
      accountHash: 'selectedAccount',
    });
  });

  it('does not classify iOS biometric cancellation as a missing password', async () => {
    Platform.OS = 'ios';
    const cancellation = Object.assign(new Error('Authentication cancelled'), {
      code: '-128',
    });
    Keychain.getGenericPassword.mockRejectedValue(cancellation);

    await expect(
      getLegacyBiometricPassword('selectedAccount'),
    ).rejects.toBe(cancellation);
  });

  it('preserves every iOS legacy password when store triggers migration', async () => {
    Platform.OS = 'ios';
    Keychain.getGenericPassword
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce({
        password: JSON.stringify({oldAccount: 'old-password'}),
      })
      .mockResolvedValueOnce({
        password: JSON.stringify({oldAccount: 'old-password'}),
      });

    await storeLegacyBiometricPassword('newAccount', 'new-password');

    expect(Keychain.setGenericPassword).toHaveBeenLastCalledWith(
      'Verus_Mobile',
      JSON.stringify({
        oldAccount: 'old-password',
        newAccount: 'new-password',
      }),
      expect.objectContaining({
        service: 'com.verus.verusmobile.biometric.currentset.v1',
      }),
    );
    expect(Keychain.resetGenericPassword).toHaveBeenCalledWith();
  });

  it('migrates iOS legacy data only after current-set readback verifies', async () => {
    Platform.OS = 'ios';
    const passwordMap = {'account-hash': 'wallet-password'};
    Keychain.getGenericPassword
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce({password: JSON.stringify(passwordMap)})
      .mockResolvedValueOnce({password: JSON.stringify(passwordMap)});

    await expect(getLegacyBiometricData()).resolves.toEqual(passwordMap);

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'Verus_Mobile',
      JSON.stringify(passwordMap),
      expect.objectContaining({
        service: 'com.verus.verusmobile.biometric.currentset.v1',
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      }),
    );
    expect(Keychain.resetGenericPassword).toHaveBeenCalledWith();
    expect(
      Keychain.setGenericPassword.mock.invocationCallOrder[0],
    ).toBeLessThan(Keychain.resetGenericPassword.mock.invocationCallOrder[0]);
  });

  it('idempotently cleans the iOS old service after a verified-write crash', async () => {
    Platform.OS = 'ios';
    const passwordMap = {'account-hash': 'wallet-password'};
    Keychain.getGenericPassword.mockResolvedValue({
      password: JSON.stringify(passwordMap),
    });

    await expect(getLegacyBiometricData()).resolves.toEqual(passwordMap);

    expect(Keychain.getGenericPassword).toHaveBeenCalledTimes(2);
    expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
    expect(Keychain.resetGenericPassword).toHaveBeenCalledWith();
  });

  it('merges an iOS beta destination with the old source before cleanup', async () => {
    Platform.OS = 'ios';
    Keychain.getGenericPassword
      .mockResolvedValueOnce({
        password: JSON.stringify({currentOnly: 'new', overlap: 'current'}),
      })
      .mockResolvedValueOnce({
        password: JSON.stringify({oldOnly: 'old', overlap: 'old'}),
      })
      .mockResolvedValueOnce({
        password: JSON.stringify({
          oldOnly: 'old',
          currentOnly: 'new',
          overlap: 'current',
        }),
      });

    await expect(getLegacyBiometricData()).resolves.toEqual({
      oldOnly: 'old',
      currentOnly: 'new',
      overlap: 'current',
    });

    expect(Keychain.resetGenericPassword).toHaveBeenCalledWith();
    expect(
      Keychain.setGenericPassword.mock.invocationCallOrder[0],
    ).toBeLessThan(Keychain.resetGenericPassword.mock.invocationCallOrder[0]);
  });

  it('never enters the iOS legacy keychain path on Android', async () => {
    Platform.OS = 'android';

    await expect(getLegacyBiometricData()).rejects.toThrow(
      'iOS biometric keychain storage is unavailable on Android.',
    );
    expect(Keychain.getGenericPassword).not.toHaveBeenCalled();
  });

  it('returns null when the persistent credential has not been created', async () => {
    Keychain.getGenericPassword.mockResolvedValue(false);

    await expect(getPersistentCredential()).resolves.toBeNull();
  });

  it('creates the first persistent credential without requiring an existing one', async () => {
    const credential = Buffer.from('first persistent credential');
    const credentialString = credential.toString('base64');

    Keychain.getGenericPassword
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce({password: credentialString});

    await expect(saveNewPersistentCredential(credential)).resolves.toBe(
      credentialString,
    );

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'Verus_Mobile',
      credentialString,
      {
        service: 'Verus_Mobile_Persistent',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );
  });

  it('removes an unverified first persistent credential', async () => {
    const credential = Buffer.from('first persistent credential');

    Keychain.getGenericPassword
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce({password: 'unexpected credential'});

    await expect(saveNewPersistentCredential(credential)).rejects.toThrow(
      'Loaded credential does not equal set credential, reset cred',
    );

    expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
      service: 'Verus_Mobile_Persistent',
    });
  });

  it('restores an existing persistent credential when replacement verification fails', async () => {
    const originalCredential = 'original-credential';
    const newCredential = Buffer.from('replacement credential');
    const newCredentialString = newCredential.toString('base64');

    Keychain.getGenericPassword
      .mockResolvedValueOnce({password: originalCredential})
      .mockResolvedValueOnce({password: 'unexpected credential'});

    await expect(saveNewPersistentCredential(newCredential)).rejects.toThrow(
      'Loaded credential does not equal set credential, reset cred',
    );

    expect(Keychain.setGenericPassword).toHaveBeenNthCalledWith(
      1,
      'Verus_Mobile',
      newCredentialString,
      {
        service: 'Verus_Mobile_Persistent',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );
    expect(Keychain.setGenericPassword).toHaveBeenNthCalledWith(
      2,
      'Verus_Mobile',
      originalCredential,
      {
        service: 'Verus_Mobile_Persistent',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );
  });
});
