import AsyncStorage from '@react-native-async-storage/async-storage';
import {Buffer} from 'buffer';
import { BigNumber } from 'verus-typescript-primitives';
import { 
  USER_DATA_STORAGE_INTERNAL_KEY,
  PERSONAL_DATA_STORAGE_INTERNAL_KEY,
  SERVICE_STORAGE_INTERNAL_KEY,
  DEEPLINK_STORAGE_INTERNAL_KEY,
  NOTIFICATIONS_STORAGE_INTERNAL_KEY
} from '../../../env/index';
import { saltedDecryptMGK, saltedEncryptMGK } from '../crypto/crypto';
import { 
  ANDROID_BIOMETRIC_CREDENTIAL_STATUS,
  createBiometricPasswordNotFoundError,
  generateBiometricCredential,
  generatePersistentCredential, 
  getAndroidBiometricCredentialStatus,
  getBiometricCredential, 
  getPersistentCredential, 
  removeBiometricCredential,
  saveNewPersistentCredential 
} from './keychain';
import { randomBytes } from '../crypto/randomBytes';
import {sha256} from '../crypto/hash';

// A password migration can touch several independently persisted records. Keep
// its recovery journal under the same device-level encryption as those records.
export const PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY = `${USER_DATA_STORAGE_INTERNAL_KEY}:passwordMigration:v1`;
export const SECURE_STORE_FLAG_KEY = 'secureStoreFlags';
export const BIOMETRIC_VAULT_STORAGE_KEY = 'biometricVaultEnrollmentBoundV2';
export const PRE_CURRENT_SET_BIOMETRIC_VAULT_STORAGE_KEY = 'biometricVault';
export const SECURE_STORE_TRANSITION_STORAGE_KEY = 'secureStoreTransitionV1';

const SECURE_STORE_TRANSITION_VERSION = 1;
const TRANSITION_ENCRYPT = 'encrypt';
const TRANSITION_DECRYPT = 'decrypt';
const TRANSITION_CYCLE_CREDENTIAL = 'cycle-credential';

const SECURE_STORE_TRANSITION_ERROR = 'SECURE_STORE_TRANSITION_FAILED';
const SECURE_STORE_ENCRYPTION_STATE_ERROR =
  'SECURE_STORE_ENCRYPTION_STATE_MISMATCH';

const isJsonObject = value =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const createSecureStoreError = (message, code, cause) => {
  const error = new Error(message);
  error.code = code;
  if (cause != null) error.cause = cause;
  return error;
};

const storageValueDigest = value =>
  sha256(Buffer.from(value, 'utf8')).toString('hex');

const isStorageValueDigest = value =>
  typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);

// Keep the coordinator outside the module instance so React Native Fast
// Refresh cannot create a second independent queue while an operation from the
// previous module instance is still completing.
const STORE_MUTATION_COORDINATOR_KEY = Symbol.for(
  'verus.mobile.secureStoreMutationCoordinator.v1',
);
const getStoreMutationCoordinator = () => {
  if (globalThis[STORE_MUTATION_COORDINATOR_KEY] == null) {
    globalThis[STORE_MUTATION_COORDINATOR_KEY] = {
      queue: Promise.resolve(),
    };
  }
  return globalThis[STORE_MUTATION_COORDINATOR_KEY];
};

class SecureStore {
  credential;
  flags;

  /** @type {Array<string>} */
  keys;

  static FLAG_STORE_IS_ENCRYPTED = new BigNumber(1);
  static FLAG_STORE_HAS_BIOMETRIC_VAULT = new BigNumber(2);

  static SECURE_STORE_FLAG_KEY = SECURE_STORE_FLAG_KEY
  static SECURE_STORE_BIOMETRIC_VAULT_KEY = BIOMETRIC_VAULT_STORAGE_KEY
  static PRE_CURRENT_SET_BIOMETRIC_VAULT_KEY =
    PRE_CURRENT_SET_BIOMETRIC_VAULT_STORAGE_KEY

  constructor(keys) {
    this.credential = null;
    this.flags = new BigNumber(0);
    this.keys = keys
    this.mutationCoordinator = getStoreMutationCoordinator();
  }

  /**
   * Serializes every storage operation that can observe or change the global
   * encryption flag. Callers supplying an operation must use raw AsyncStorage
   * or unlocked helpers; recursively calling a public SecureStore method would
   * wait on itself.
   */
  withStoreMutationLock(operation) {
    const queued = this.mutationCoordinator.queue.then(operation, operation);
    this.mutationCoordinator.queue = queued.catch(() => {});
    return queued;
  }

  async storageIsEncrypted() {
    const item = await AsyncStorage.getItem(SecureStore.SECURE_STORE_FLAG_KEY);

    if (item == null) return false;

    return !!(new BigNumber(item).and(SecureStore.FLAG_STORE_IS_ENCRYPTED).toNumber());
  }

  async loadStoredFlagsUnlocked() {
    const storedFlags = await AsyncStorage.getItem(
      SecureStore.SECURE_STORE_FLAG_KEY,
    );
    this.flags = new BigNumber(storedFlags || 0);
    return this.flags;
  }

  flagsWithEncryptionState(flags, encrypted) {
    const currentFlags = new BigNumber(flags || 0);
    const currentlyEncrypted = !!currentFlags
      .and(SecureStore.FLAG_STORE_IS_ENCRYPTED)
      .toNumber();

    return currentlyEncrypted === encrypted
      ? currentFlags
      : currentFlags.xor(SecureStore.FLAG_STORE_IS_ENCRYPTED);
  }

  validatePlaintextForKey(key, plaintext) {
    let parsed;
    try {
      parsed = JSON.parse(plaintext);
    } catch (cause) {
      throw createSecureStoreError(
        `Secure storage key ${key} does not contain valid JSON.`,
        SECURE_STORE_ENCRYPTION_STATE_ERROR,
        cause,
      );
    }

    const hasExpectedContainer =
      key === DEEPLINK_STORAGE_INTERNAL_KEY
        ? Array.isArray(parsed)
        : isJsonObject(parsed);
    if (!hasExpectedContainer) {
      throw createSecureStoreError(
        `Secure storage key ${key} does not contain the expected JSON container.`,
        SECURE_STORE_ENCRYPTION_STATE_ERROR,
      );
    }

  }

  validateTransitionPayload(payload) {
    if (
      !isJsonObject(payload) ||
      payload.version !== SECURE_STORE_TRANSITION_VERSION ||
      !Number.isFinite(payload.createdAt)
    ) {
      throw createSecureStoreError(
        'Secure storage transition journal is invalid.',
        SECURE_STORE_TRANSITION_ERROR,
      );
    }

    if (payload.operation === TRANSITION_ENCRYPT) {
      if (payload.sourceEncrypted !== false || payload.targetEncrypted !== true) {
        throw createSecureStoreError(
          'Secure storage encryption journal has invalid states.',
          SECURE_STORE_TRANSITION_ERROR,
        );
      }
    } else if (payload.operation === TRANSITION_DECRYPT) {
      const recordKeys = Array.isArray(payload.records)
        ? payload.records.map(record => record?.key)
        : [];
      const recordsAreValid =
        Array.isArray(payload.records) &&
        payload.records.length > 0 &&
        new Set(recordKeys).size === recordKeys.length &&
        payload.records.every(
          record =>
            isJsonObject(record) &&
            typeof record.key === 'string' &&
            record.key.length > 0 &&
            ((record.sourceDigest == null && record.targetDigest == null) ||
              (isStorageValueDigest(record.sourceDigest) &&
                isStorageValueDigest(record.targetDigest))),
        );

      if (
        payload.sourceEncrypted !== true ||
        payload.targetEncrypted !== false ||
        !recordsAreValid
      ) {
        throw createSecureStoreError(
          'Secure storage decryption journal has invalid states.',
          SECURE_STORE_TRANSITION_ERROR,
        );
      }
    } else if (payload.operation === TRANSITION_CYCLE_CREDENTIAL) {
      if (
        payload.sourceEncrypted !== true ||
        payload.targetEncrypted !== true ||
        typeof payload.oldCredential !== 'string' ||
        payload.oldCredential.length === 0 ||
        typeof payload.newCredential !== 'string' ||
        payload.newCredential.length === 0 ||
        payload.oldCredential === payload.newCredential
      ) {
        throw createSecureStoreError(
          'Secure storage credential journal is invalid.',
          SECURE_STORE_TRANSITION_ERROR,
        );
      }
    } else {
      throw createSecureStoreError(
        'Secure storage transition journal has an unknown operation.',
        SECURE_STORE_TRANSITION_ERROR,
      );
    }

    return payload;
  }

  async writeTransitionJournalUnlocked(payload, credentials = [this.credential]) {
    this.validateTransitionPayload(payload);
    const uniqueCredentials = [...new Set(credentials)];

    if (uniqueCredentials.some(value => typeof value !== 'string' || !value)) {
      throw createSecureStoreError(
        'Cannot authenticate a secure storage transition without a credential.',
        SECURE_STORE_TRANSITION_ERROR,
      );
    }

    const plaintext = JSON.stringify(payload);
    const envelopes = await Promise.all(
      uniqueCredentials.map(credential => saltedEncryptMGK(credential, plaintext)),
    );
    envelopes.forEach((envelope, index) => {
      if (
        saltedDecryptMGK(uniqueCredentials[index], envelope) !== plaintext
      ) {
        throw createSecureStoreError(
          'Secure storage transition journal failed authentication verification.',
          SECURE_STORE_TRANSITION_ERROR,
        );
      }
    });
    const storedContainer = JSON.stringify({
      version: SECURE_STORE_TRANSITION_VERSION,
      envelopes,
    });
    await AsyncStorage.setItem(
      SECURE_STORE_TRANSITION_STORAGE_KEY,
      storedContainer,
    );
    if (
      (await AsyncStorage.getItem(SECURE_STORE_TRANSITION_STORAGE_KEY)) !==
      storedContainer
    ) {
      throw createSecureStoreError(
        'Secure storage transition journal write could not be verified.',
        SECURE_STORE_TRANSITION_ERROR,
      );
    }
  }

  async loadTransitionJournalUnlocked() {
    const storedJournal = await AsyncStorage.getItem(
      SECURE_STORE_TRANSITION_STORAGE_KEY,
    );
    if (storedJournal == null) return null;

    this.validateCredential();

    let journalContainer;
    try {
      journalContainer = JSON.parse(storedJournal);
    } catch (cause) {
      throw createSecureStoreError(
        'Secure storage transition journal cannot be parsed.',
        SECURE_STORE_TRANSITION_ERROR,
        cause,
      );
    }

    if (
      !isJsonObject(journalContainer) ||
      journalContainer.version !== SECURE_STORE_TRANSITION_VERSION ||
      !Array.isArray(journalContainer.envelopes) ||
      journalContainer.envelopes.length === 0 ||
      journalContainer.envelopes.some(
        envelope => typeof envelope !== 'string' || envelope.length === 0,
      )
    ) {
      throw createSecureStoreError(
        'Secure storage transition journal container is invalid.',
        SECURE_STORE_TRANSITION_ERROR,
      );
    }

    for (const envelope of journalContainer.envelopes) {
      try {
        const payload = JSON.parse(
          saltedDecryptMGK(this.credential, envelope),
        );
        return this.validateTransitionPayload(payload);
      } catch (_) {
        // A credential cycle stores one envelope for either possible Keychain
        // state. Only a successfully authenticated envelope may be trusted.
      }
    }

    throw createSecureStoreError(
      'Secure storage transition journal cannot be authenticated.',
      SECURE_STORE_TRANSITION_ERROR,
    );
  }

  async writeAndVerifyUnlocked(updates) {
    if (updates.length === 0) return;

    await AsyncStorage.multiSet(updates);
    const storedUpdates = new Map(
      await AsyncStorage.multiGet(updates.map(([key]) => key)),
    );

    for (const [key, expectedValue] of updates) {
      if (storedUpdates.get(key) !== expectedValue) {
        throw createSecureStoreError(
          `Secure storage failed to verify transition write for ${key}.`,
          SECURE_STORE_TRANSITION_ERROR,
        );
      }
    }
  }

  tryDecryptWithCredential(value, credential) {
    try {
      return {decrypted: true, value: saltedDecryptMGK(credential, value)};
    } catch (_) {
      return {decrypted: false, value: null};
    }
  }

  async normalizeEncryptionTransitionValueUnlocked(key, value, journal) {
    const encryptedValue = this.tryDecryptWithCredential(value, this.credential);

    if (journal.targetEncrypted) {
      if (encryptedValue.decrypted) {
        this.validatePlaintextForKey(key, encryptedValue.value);
        return value;
      }

      if (journal.operation !== TRANSITION_ENCRYPT) {
        throw createSecureStoreError(
          `Secure storage key ${key} cannot be authenticated during recovery.`,
          SECURE_STORE_TRANSITION_ERROR,
        );
      }

      this.validatePlaintextForKey(key, value);
      const encrypted = await saltedEncryptMGK(this.credential, value);
      if (saltedDecryptMGK(this.credential, encrypted) !== value) {
        throw createSecureStoreError(
          `Secure storage key ${key} failed encryption verification.`,
          SECURE_STORE_TRANSITION_ERROR,
        );
      }
      return encrypted;
    }

    if (encryptedValue.decrypted) {
      this.validatePlaintextForKey(key, encryptedValue.value);
      return encryptedValue.value;
    }

    if (journal.operation !== TRANSITION_DECRYPT) {
      throw createSecureStoreError(
        `Secure storage key ${key} cannot be decrypted during recovery.`,
        SECURE_STORE_TRANSITION_ERROR,
      );
    }

    // A decryption journal authenticates that plaintext is an expected target
    // state after a partial iOS multiSet. No plaintext fallback occurs without
    // this journal, including for pending deep-link requests.
    this.validatePlaintextForKey(key, value);
    return value;
  }

  async recoverEncryptionStateTransitionUnlocked(journal) {
    if (journal.operation === TRANSITION_DECRYPT) {
      return this.recoverDecryptionTransitionUnlocked(journal);
    }

    const storage = await AsyncStorage.multiGet(this.keys);
    const updates = [];

    for (const [key, value] of storage) {
      if (value == null) continue;
      updates.push([
        key,
        await this.normalizeEncryptionTransitionValueUnlocked(
          key,
          value,
          journal,
        ),
      ]);
    }

    const latestFlags = await this.loadStoredFlagsUnlocked();
    const targetFlags = this.flagsWithEncryptionState(
      latestFlags,
      journal.targetEncrypted,
    );
    updates.push([
      SecureStore.SECURE_STORE_FLAG_KEY,
      targetFlags.toString(),
    ]);

    await this.writeAndVerifyUnlocked(updates);
    this.flags = targetFlags;
    await AsyncStorage.removeItem(SECURE_STORE_TRANSITION_STORAGE_KEY);
  }

  async recoverDecryptionTransitionUnlocked(journal) {
    const recordsByKey = new Map(
      journal.records.map(record => [record.key, record]),
    );
    const transitionKeys = [...new Set([...this.keys, ...recordsByKey.keys()])];
    const storage = new Map(await AsyncStorage.multiGet(transitionKeys));
    const updates = [];

    for (const key of transitionKeys) {
      const record = recordsByKey.get(key);
      const value = storage.get(key);

      // A key added by a later app version is safe only if nothing has written
      // it before the older interrupted transition is recovered.
      if (record == null) {
        if (value != null) {
          throw createSecureStoreError(
            `Secure storage key ${key} was not part of the authenticated decryption snapshot.`,
            SECURE_STORE_TRANSITION_ERROR,
          );
        }
        continue;
      }

      if (record.sourceDigest == null) {
        if (value != null) {
          throw createSecureStoreError(
            `Secure storage key ${key} appeared after decryption began.`,
            SECURE_STORE_TRANSITION_ERROR,
          );
        }
        continue;
      }

      if (value == null) {
        throw createSecureStoreError(
          `Secure storage key ${key} disappeared during decryption.`,
          SECURE_STORE_TRANSITION_ERROR,
        );
      }

      const currentDigest = storageValueDigest(value);
      if (currentDigest === record.targetDigest) {
        this.validatePlaintextForKey(key, value);
        updates.push([key, value]);
        continue;
      }

      if (currentDigest !== record.sourceDigest) {
        throw createSecureStoreError(
          `Secure storage key ${key} does not match the authenticated decryption snapshot.`,
          SECURE_STORE_TRANSITION_ERROR,
        );
      }

      const decryptedValue = this.tryDecryptWithCredential(
        value,
        this.credential,
      );
      if (
        !decryptedValue.decrypted ||
        storageValueDigest(decryptedValue.value) !== record.targetDigest
      ) {
        throw createSecureStoreError(
          `Secure storage key ${key} failed authenticated decryption recovery.`,
          SECURE_STORE_TRANSITION_ERROR,
        );
      }
      this.validatePlaintextForKey(key, decryptedValue.value);
      updates.push([key, decryptedValue.value]);
    }

    const latestFlags = await this.loadStoredFlagsUnlocked();
    const targetFlags = this.flagsWithEncryptionState(latestFlags, false);
    updates.push([
      SecureStore.SECURE_STORE_FLAG_KEY,
      targetFlags.toString(),
    ]);

    await this.writeAndVerifyUnlocked(updates);
    this.flags = targetFlags;
    await AsyncStorage.removeItem(SECURE_STORE_TRANSITION_STORAGE_KEY);
  }

  async createDecryptionSnapshotUnlocked() {
    const storage = new Map(await AsyncStorage.multiGet(this.keys));

    return this.keys.map(key => {
      const sourceValue = storage.get(key);
      if (sourceValue == null) {
        return {key, sourceDigest: null, targetDigest: null};
      }

      const targetValue = this.tryDecryptWithCredential(
        sourceValue,
        this.credential,
      );
      if (!targetValue.decrypted) {
        throw createSecureStoreError(
          `Secure storage key ${key} cannot be included in a decryption snapshot.`,
          SECURE_STORE_ENCRYPTION_STATE_ERROR,
        );
      }
      this.validatePlaintextForKey(key, targetValue.value);

      return {
        key,
        sourceDigest: storageValueDigest(sourceValue),
        targetDigest: storageValueDigest(targetValue.value),
      };
    });
  }

  async recoverCredentialCycleUnlocked(journal) {
    const storage = await AsyncStorage.multiGet(this.keys);
    const updates = [];

    for (const [key, value] of storage) {
      if (value == null) continue;

      const targetValue = this.tryDecryptWithCredential(
        value,
        journal.newCredential,
      );
      if (targetValue.decrypted) {
        this.validatePlaintextForKey(key, targetValue.value);
        updates.push([key, value]);
        continue;
      }

      const sourceValue = this.tryDecryptWithCredential(
        value,
        journal.oldCredential,
      );
      if (!sourceValue.decrypted) {
        throw createSecureStoreError(
          `Secure storage key ${key} cannot be authenticated during credential recovery.`,
          SECURE_STORE_TRANSITION_ERROR,
        );
      }

      this.validatePlaintextForKey(key, sourceValue.value);
      const reencryptedValue = await saltedEncryptMGK(
        journal.newCredential,
        sourceValue.value,
      );
      if (
        saltedDecryptMGK(journal.newCredential, reencryptedValue) !==
        sourceValue.value
      ) {
        throw createSecureStoreError(
          `Secure storage key ${key} failed credential-cycle verification.`,
          SECURE_STORE_TRANSITION_ERROR,
        );
      }
      updates.push([key, reencryptedValue]);
    }

    const latestFlags = await this.loadStoredFlagsUnlocked();
    const targetFlags = this.flagsWithEncryptionState(latestFlags, true);
    updates.push([
      SecureStore.SECURE_STORE_FLAG_KEY,
      targetFlags.toString(),
    ]);
    await this.writeAndVerifyUnlocked(updates);

    await saveNewPersistentCredential(
      Buffer.from(journal.newCredential, 'base64'),
    );
    this.credential = journal.newCredential;
    this.flags = targetFlags;
    await AsyncStorage.removeItem(SECURE_STORE_TRANSITION_STORAGE_KEY);
  }

  async recoverTransitionUnlocked() {
    const journal = await this.loadTransitionJournalUnlocked();
    if (journal == null) return false;

    if (
      journal.operation === TRANSITION_ENCRYPT ||
      journal.operation === TRANSITION_DECRYPT
    ) {
      await this.recoverEncryptionStateTransitionUnlocked(journal);
    } else if (journal.operation === TRANSITION_CYCLE_CREDENTIAL) {
      await this.recoverCredentialCycleUnlocked(journal);
    }

    return true;
  }

  /**
   * Validate each protected root independently. Existing-store startup may
   * tolerate an isolated unreadable root so unrelated wallet data remains
   * available, but the user root and password-migration journal remain
   * required when present. Encryption-state and credential transitions stay
   * strict. Unreadable ciphertext is never removed or replaced here.
   */
  async validateEncryptedStorageUnlocked({allowPartialFailure = false} = {}) {
    const storage = await AsyncStorage.multiGet(this.keys);
    const failures = [];

    for (const [key, value] of storage) {
      if (value == null) continue;

      try {
        const decryptedValue = this.tryDecryptWithCredential(
          value,
          this.credential,
        );
        if (!decryptedValue.decrypted) {
          throw createSecureStoreError(
            `Secure storage key ${key} does not match the encrypted store state.`,
            SECURE_STORE_ENCRYPTION_STATE_ERROR,
          );
        }
        this.validatePlaintextForKey(key, decryptedValue.value);
      } catch (error) {
        failures.push({key, error});
      }
    }

    const requiredFailure = failures.find(
      ({key}) =>
        key === USER_DATA_STORAGE_INTERNAL_KEY ||
        key === PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY,
    );
    if (
      failures.length > 0 &&
      (!allowPartialFailure || requiredFailure != null)
    ) {
      throw (requiredFailure || failures[0]).error;
    }

    failures.forEach(({key, error}) => {
      console.warn(
        `Secure storage key ${key} could not be validated and remains unavailable.`,
        error,
      );
    });

    return failures;
  }

  async initializeWithKeychainUnlocked() {
    let persistentCredential;

    try {
      persistentCredential = await getPersistentCredential();
    } catch(e) {
      console.warn("Could not initialize persistent credential into keychain")
      console.warn(e)
      throw e;
    }

    if (persistentCredential == null) {
      const [storedFlags, transitionJournal] = await AsyncStorage.multiGet([
        SecureStore.SECURE_STORE_FLAG_KEY,
        SECURE_STORE_TRANSITION_STORAGE_KEY,
      ]);
      const flags = new BigNumber(storedFlags[1] || 0);
      const storeIsEncrypted = !!flags
        .and(SecureStore.FLAG_STORE_IS_ENCRYPTED)
        .toNumber();

      // A journal can describe a partially encrypted store even while the
      // committed flag still says plaintext. Never generate a replacement
      // credential over either state; initialization must fail closed until
      // the original Keychain credential is available again.
      if (storeIsEncrypted || transitionJournal[1] != null) {
        return this.initializeUnlocked(null);
      }

      try {
        persistentCredential = await generatePersistentCredential();
      } catch(e) {
        console.warn("Could not initialize persistent credential into keychain")
        console.warn(e)
        throw e;
      }

      return this.initializeUnlocked(persistentCredential);
    }

    return this.initializeUnlocked(persistentCredential);
  }

  async initializeWithKeychain() {
    return this.withStoreMutationLock(() =>
      this.initializeWithKeychainUnlocked(),
    );
  }

  async invalidateCurrentSetBiometricVault() {
    return this.withStoreMutationLock(() =>
      this._invalidateCurrentSetBiometricVaultUnlocked(),
    );
  }

  async _invalidateCurrentSetBiometricVaultUnlocked() {
    await this.recoverTransitionUnlocked();
    await this.loadStoredFlagsUnlocked();

    let currentFlags = this.flags;

    if (currentFlags == null) {
      const storedFlags = await AsyncStorage.getItem(
        SecureStore.SECURE_STORE_FLAG_KEY,
      );
      currentFlags = new BigNumber(storedFlags || 0);
    }

    if (
      currentFlags
        .and(SecureStore.FLAG_STORE_HAS_BIOMETRIC_VAULT)
        .toNumber()
    ) {
      currentFlags = currentFlags.xor(
        SecureStore.FLAG_STORE_HAS_BIOMETRIC_VAULT,
      );
    }

    await AsyncStorage.multiRemove([
      SecureStore.SECURE_STORE_BIOMETRIC_VAULT_KEY,
    ]);
    await AsyncStorage.setItem(
      SecureStore.SECURE_STORE_FLAG_KEY,
      currentFlags.toString(),
    );
    this.flags = currentFlags;

    try {
      await removeBiometricCredential();
    } catch (_) {}
  }

  async initializeUnlocked(credential) {
    this.credential = credential;
    await this.loadStoredFlagsUnlocked();
    await this.recoverTransitionUnlocked();

    const item = await AsyncStorage.getItem(SecureStore.SECURE_STORE_FLAG_KEY);

    if (item != null) {
      this.flags = new BigNumber(item);

      if (this.isEncrypted()) {
        // Authenticate the wallet root before any legacy migration writes. A
        // stale/wrong Keychain credential must never rewrite recoverable
        // plaintext feature data under the wrong key.
        await this.validateEncryptedStorageUnlocked({
          allowPartialFailure: true,
        });
        await this.migrateLegacyPlaintextJsonKey(
          NOTIFICATIONS_STORAGE_INTERNAL_KEY,
        );
      }
    } else if (credential != null) {
      const journal = {
        version: SECURE_STORE_TRANSITION_VERSION,
        operation: TRANSITION_ENCRYPT,
        sourceEncrypted: false,
        targetEncrypted: true,
        createdAt: Date.now(),
      };
      await this.writeTransitionJournalUnlocked(journal);
      await this.recoverEncryptionStateTransitionUnlocked(journal);
      await this.validateEncryptedStorageUnlocked();
    }
  }

  async initialize(credential) {
    return this.withStoreMutationLock(() => this.initializeUnlocked(credential));
  }

  encryptedFlagSet() {
    return !!((this.flags.and(SecureStore.FLAG_STORE_IS_ENCRYPTED)).toNumber())
  }

  biometryFlagSet() {
    return !!((this.flags.and(SecureStore.FLAG_STORE_HAS_BIOMETRIC_VAULT)).toNumber())
  }

  async hasBiometricVault() {
    return (await AsyncStorage.getItem(SecureStore.SECURE_STORE_BIOMETRIC_VAULT_KEY)) != null;
  }

  toggleEncryptedFlag() {
    this.flags = this.flags.xor(SecureStore.FLAG_STORE_IS_ENCRYPTED);
  }

  toggleBiometryFlag() {
    this.flags = this.flags.xor(SecureStore.FLAG_STORE_HAS_BIOMETRIC_VAULT);
  }

  setEncryptedFlag(state = true) {
    if (this.encryptedFlagSet() !== state) {
      this.toggleEncryptedFlag()
    }
  }

  setBiometryFlag(state = true) {
    if (this.biometryFlagSet() !== state) {
      this.toggleBiometryFlag()
    }
  }

  isEncrypted() {
    if (this.encryptedFlagSet()) {
      if (this.credential == null) throw new Error("CRITICAL ERROR! Unable to decrypt wallet data because of missing keychain credential! Try restarting wallet, or clearing wallet data and restoring your wallet from the seed you have backed up (this action will clear all wallet/account data from this device).");

      return true;
    } else return false
  }

  isEncryptedKey(key) {
    return this.isEncrypted() && this.keys.includes(key)
  }

  validateCredential() {
    if (this.credential == null) {
      throw new Error("Invalid or missing credential for secure store")
    }
  }

  /**
   * Keys added to the encrypted allowlist may already contain plaintext on an
   * upgraded installation. Migrate only data that authenticates as encrypted
   * or parses as the expected legacy JSON; never silently reinterpret an
   * unknown value.
   */
  async migrateLegacyPlaintextJsonKey(key) {
    if (!this.keys.includes(key)) return;

    const storedValue = await AsyncStorage.getItem(key);
    if (storedValue == null) return;

    try {
      this.decryptData(storedValue);
      return;
    } catch (e) {
      // This is expected for the plaintext value written by older releases.
    }

    let plaintextValue = storedValue;
    let parsedValue;
    try {
      parsedValue = JSON.parse(plaintextValue);
    } catch (e) {
      // Unknown data may be ciphertext from an unavailable credential. Leave
      // it untouched so one feature-local failure cannot destroy recoverable
      // data or masquerade as a successful global credential validation.
      return false;
    }

    if (
      parsedValue == null ||
      typeof parsedValue !== 'object' ||
      Array.isArray(parsedValue)
    ) {
      return false;
    }

    const encryptedValue = await this.encryptData(plaintextValue);
    if (this.decryptData(encryptedValue) !== plaintextValue) {
      throw new Error(`Unable to verify secure storage migration for ${key}`);
    }

    await AsyncStorage.setItem(key, encryptedValue);
    return true;
  }

  async encryptData(data) {
    this.validateCredential();

    return saltedEncryptMGK(this.credential, data);
  }

  decryptData(b64) {
    this.validateCredential();

    return saltedDecryptMGK(this.credential, b64);
  }

  async encryptAllStorageUnlocked() {
    this.validateCredential();
    await this.recoverTransitionUnlocked();
    await this.loadStoredFlagsUnlocked();

    if (this.encryptedFlagSet()) {
      await this.validateEncryptedStorageUnlocked();
      return;
    }

    const plaintextStorage = await AsyncStorage.multiGet(this.keys);
    for (const [key, value] of plaintextStorage) {
      if (value != null) this.validatePlaintextForKey(key, value);
    }

    const journal = {
      version: SECURE_STORE_TRANSITION_VERSION,
      operation: TRANSITION_ENCRYPT,
      sourceEncrypted: false,
      targetEncrypted: true,
      createdAt: Date.now(),
    };
    await this.writeTransitionJournalUnlocked(journal);
    await this.recoverEncryptionStateTransitionUnlocked(journal);
    await this.validateEncryptedStorageUnlocked();
  }

  async encryptAllStorage() {
    return this.withStoreMutationLock(() => this.encryptAllStorageUnlocked());
  }

  async decryptAllStorageUnlocked() {
    await this.recoverTransitionUnlocked();
    await this.loadStoredFlagsUnlocked();

    if (!this.encryptedFlagSet()) return;

    this.validateCredential();
    await this.validateEncryptedStorageUnlocked();
    const journal = {
      version: SECURE_STORE_TRANSITION_VERSION,
      operation: TRANSITION_DECRYPT,
      sourceEncrypted: true,
      targetEncrypted: false,
      records: await this.createDecryptionSnapshotUnlocked(),
      createdAt: Date.now(),
    };
    await this.writeTransitionJournalUnlocked(journal);
    await this.recoverEncryptionStateTransitionUnlocked(journal);
  }

  async decryptAllStorage() {
    return this.withStoreMutationLock(() => this.decryptAllStorageUnlocked());
  }

  async cycleCredentialUnlocked() {
    await this.recoverTransitionUnlocked();
    await this.loadStoredFlagsUnlocked();
    this.validateCredential();

    const newCredential = await randomBytes(128);
    const newCredentialString = newCredential.toString('base64');

    if (!this.encryptedFlagSet()) {
      this.credential = await saveNewPersistentCredential(newCredential);
      return this.credential;
    }

    await this.validateEncryptedStorageUnlocked();
    const journal = {
      version: SECURE_STORE_TRANSITION_VERSION,
      operation: TRANSITION_CYCLE_CREDENTIAL,
      sourceEncrypted: true,
      targetEncrypted: true,
      oldCredential: this.credential,
      newCredential: newCredentialString,
      createdAt: Date.now(),
    };
    await this.writeTransitionJournalUnlocked(journal, [
      journal.oldCredential,
      journal.newCredential,
    ]);
    await this.recoverCredentialCycleUnlocked(journal);
    return this.credential;
  }

  async cycleCredential() {
    return this.withStoreMutationLock(() => this.cycleCredentialUnlocked());
  }

  async setItem(key, value, callback) {
    return this.withStoreMutationLock(async () => {
      await this.recoverTransitionUnlocked();
      await this.loadStoredFlagsUnlocked();

      if (this.keys.includes(key)) this.validatePlaintextForKey(key, value);

      if (this.isEncryptedKey(key)) {
        this.validateCredential();
        const encryptedValue = await this.encryptData(value);
        if (this.decryptData(encryptedValue) !== value) {
          throw createSecureStoreError(
            `Secure storage failed to verify write for ${key}.`,
            SECURE_STORE_TRANSITION_ERROR,
          );
        }
        return AsyncStorage.setItem(key, encryptedValue, callback);
      }

      return AsyncStorage.setItem(key, value, callback);
    });
  }

  async getItem(key, callback) {
    return this.withStoreMutationLock(async () => {
      await this.recoverTransitionUnlocked();
      await this.loadStoredFlagsUnlocked();

      if (this.isEncryptedKey(key)) {
        this.validateCredential();
        const item = await AsyncStorage.getItem(key, callback);

        if (item == null) return item;

        try {
          const decryptedItem = this.decryptData(item);
          if (!decryptedItem) throw new Error("Failed to decrypt")
          this.validatePlaintextForKey(key, decryptedItem);
          return decryptedItem;
        } catch (e) {
          if (e?.code === SECURE_STORE_ENCRYPTION_STATE_ERROR) {
            throw e;
          }
          throw new Error("CRITICAL ERROR! Unable to decrypt encrypted wallet data. Try restarting your wallet, or clearing wallet data and restoring your wallet from the seed you have backed up (this action will clear all wallet/account data from this device).");
        }
      }

      return AsyncStorage.getItem(key, callback);
    });
  }

  async getPasswordFromBiometricVault(accountHash) {
    return this.withStoreMutationLock(() =>
      this._getPasswordFromBiometricVaultUnlocked(accountHash),
    );
  }

  async _getPasswordFromBiometricVaultUnlocked(accountHash) {
    await this.recoverTransitionUnlocked();
    await this.loadStoredFlagsUnlocked();

    const bioCred = await getBiometricCredential();

    if (bioCred == null) throw new Error("No biometric credential found in keychain");

    const vault = await AsyncStorage.getItem(
      SecureStore.SECURE_STORE_BIOMETRIC_VAULT_KEY,
    );

    if (vault == null) {
      throw createBiometricPasswordNotFoundError(accountHash);
    }

    let dataJson;
    try {
      dataJson = JSON.parse(saltedDecryptMGK(bioCred, vault));
    } catch (cause) {
      const error = new Error(
        'Unable to decrypt or parse the biometric password vault.',
      );
      error.cause = cause;
      throw error;
    }

    if (
      dataJson == null ||
      typeof dataJson !== 'object' ||
      Array.isArray(dataJson)
    ) {
      throw new Error('Biometric vault contains invalid password data.');
    }

    if (!Object.prototype.hasOwnProperty.call(dataJson, accountHash)) {
      throw createBiometricPasswordNotFoundError(accountHash);
    }

    if (typeof dataJson[accountHash] !== 'string') {
      throw new Error('Biometric vault contains an invalid password.');
    }

    return dataJson[accountHash];
  }

  /**
   * Atomically enables or updates the Android biometric vault. In particular,
   * the first-vault check, native credential creation, credential readback,
   * and vault write all share the store-wide mutation lock. Two simultaneous
   * first-enable requests therefore cannot replace each other's wrapping key.
   */
  async storePasswordInBiometricVaultAtomic(accountHash, password) {
    return this.withStoreMutationLock(() =>
      this._storePasswordInBiometricVaultAtomicUnlocked(accountHash, password),
    );
  }

  async _storePasswordInBiometricVaultAtomicUnlocked(accountHash, password) {
    await this.recoverTransitionUnlocked();
    await this.loadStoredFlagsUnlocked();

    const vaultKey = SecureStore.SECURE_STORE_BIOMETRIC_VAULT_KEY;
    const flagsKey = SecureStore.SECURE_STORE_FLAG_KEY;
    let previousVault = await AsyncStorage.getItem(vaultKey);
    let previousFlags = this.flags;
    let createdCredential = null;
    const status = await getAndroidBiometricCredentialStatus();

    if (status !== ANDROID_BIOMETRIC_CREDENTIAL_STATUS.VALID) {
      if (previousVault != null) {
        // MISSING/INVALIDATED means the old ciphertext is cryptographically
        // unrecoverable. Clear it and its flag before creating a replacement,
        // so a cancellation/crash cannot pair the new key with the old vault.
        let resetFlags = previousFlags;
        if (
          resetFlags
            .and(SecureStore.FLAG_STORE_HAS_BIOMETRIC_VAULT)
            .toNumber()
        ) {
          resetFlags = resetFlags.xor(
            SecureStore.FLAG_STORE_HAS_BIOMETRIC_VAULT,
          );
        }
        await AsyncStorage.removeItem(vaultKey);
        await AsyncStorage.setItem(flagsKey, resetFlags.toString());
        this.flags = resetFlags;
        previousVault = null;
        previousFlags = resetFlags;
      }

      createdCredential = await generateBiometricCredential();
    }

    const bioCred = await getBiometricCredential(
      'Authenticate to store password in biometric vault',
    );
    if (bioCred == null) {
      throw new Error('No biometric credential found in keychain');
    }
    if (createdCredential != null && createdCredential !== bioCred) {
      throw new Error('New biometric credential did not round-trip');
    }

    let newVault = {};
    if (previousVault != null) {
      const parsedVault = JSON.parse(saltedDecryptMGK(bioCred, previousVault));
      if (
        parsedVault == null ||
        typeof parsedVault !== 'object' ||
        Array.isArray(parsedVault)
      ) {
        throw new Error('Biometric vault contains invalid password data');
      }
      newVault = parsedVault;
    }
    newVault[accountHash] = password;

    const plaintext = JSON.stringify(newVault);
    const encryptedNewVault = await saltedEncryptMGK(bioCred, plaintext);
    const newFlags = previousFlags.or(
      SecureStore.FLAG_STORE_HAS_BIOMETRIC_VAULT,
    );

    await AsyncStorage.multiSet([
      [vaultKey, encryptedNewVault],
      [flagsKey, newFlags.toString()],
    ]);

    try {
      const [storedVault, storedFlags] = await AsyncStorage.multiGet([
        vaultKey,
        flagsKey,
      ]);
      if (
        storedVault[1] !== encryptedNewVault ||
        storedFlags[1] !== newFlags.toString() ||
        saltedDecryptMGK(bioCred, storedVault[1]) !== plaintext
      ) {
        throw new Error('Biometric vault did not round-trip after writing');
      }
    } catch (error) {
      // Best-effort rollback preserves an existing vault if the storage layer
      // reports a failed/partial write. A successful write is self-verifying on
      // the next read even if the process exits before this check completes.
      if (previousVault == null) {
        await AsyncStorage.removeItem(vaultKey);
      } else {
        await AsyncStorage.setItem(vaultKey, previousVault);
      }
      await AsyncStorage.setItem(flagsKey, previousFlags.toString());
      this.flags = previousFlags;
      throw error;
    }

    this.flags = newFlags;
  }

  async removePasswordFromBiometricVault(accountHash) {
    return this.withStoreMutationLock(() =>
      this._removePasswordFromBiometricVaultUnlocked(accountHash),
    );
  }

  async _removePasswordFromBiometricVaultUnlocked(accountHash) {
    await this.recoverTransitionUnlocked();
    await this.loadStoredFlagsUnlocked();

    const bioCred = await getBiometricCredential();
    if (bioCred == null) throw new Error("No biometric credential found in keychain");

    const vault = await AsyncStorage.getItem(SecureStore.SECURE_STORE_BIOMETRIC_VAULT_KEY);

    if (vault == null) throw new Error("No vault found to remove key from")

    let newVault = JSON.parse(saltedDecryptMGK(bioCred, vault));
    delete newVault[accountHash];

    const encryptedNewVault = await saltedEncryptMGK(bioCred, JSON.stringify(newVault));

    return AsyncStorage.setItem(SecureStore.SECURE_STORE_BIOMETRIC_VAULT_KEY, encryptedNewVault);
  }

  multiRemove(keys, callback) {
    return this.withStoreMutationLock(async () => {
      await this.recoverTransitionUnlocked();
      await this.loadStoredFlagsUnlocked();
      return AsyncStorage.multiRemove(keys, callback);
    });
  }

  removeItem(key, callback) {
    return this.withStoreMutationLock(async () => {
      await this.recoverTransitionUnlocked();
      await this.loadStoredFlagsUnlocked();
      return AsyncStorage.removeItem(key, callback);
    });
  }
}

export const SecureStorage = new SecureStore(
  [
    USER_DATA_STORAGE_INTERNAL_KEY,
    PERSONAL_DATA_STORAGE_INTERNAL_KEY,
    SERVICE_STORAGE_INTERNAL_KEY,
    DEEPLINK_STORAGE_INTERNAL_KEY,
    NOTIFICATIONS_STORAGE_INTERNAL_KEY,
    PASSWORD_MIGRATION_STORAGE_INTERNAL_KEY
  ]
);
