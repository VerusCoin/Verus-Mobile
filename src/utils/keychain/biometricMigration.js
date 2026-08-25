import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import {BigNumber} from 'verus-typescript-primitives';
import {saltedDecryptMGK, saltedEncryptMGK} from '../crypto/crypto';
import {
  ANDROID_BIOMETRIC_CREDENTIAL_STATUS,
  generateBiometricCredential,
  getAndroidBiometricCredentialStatus,
  getBiometricCredential,
  getPreCurrentSetBiometricCredential,
  getPreCurrentSetBiometricSourceAvailability,
  getPreCurrentSetLegacyBiometricData,
  removePreCurrentSetBiometricCredential,
  removePreCurrentSetLegacyBiometricData,
} from './keychain';
import {
  BIOMETRIC_VAULT_STORAGE_KEY,
  PRE_CURRENT_SET_BIOMETRIC_VAULT_STORAGE_KEY,
  SECURE_STORE_FLAG_KEY,
  SecureStorage,
} from './secureStore';

const createMigrationError = (message, cause) => {
  const error = new Error(message);
  error.code = 'BIOMETRIC_MIGRATION_FAILED';
  if (cause != null) error.cause = cause;
  return error;
};

const validatePasswordMap = value => {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    throw createMigrationError('Legacy biometric password data is invalid.');
  }

  for (const key of Object.keys(value)) {
    if (typeof value[key] !== 'string') {
      throw createMigrationError(
        'Legacy biometric password data contains an invalid password.',
      );
    }
  }
  return value;
};

const canonicalPasswordMap = value =>
  JSON.stringify(
    Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, value[key]]),
    ),
  );

const discoverSources = async () => {
  const [preCurrentVault, availability] = await Promise.all([
    AsyncStorage.getItem(PRE_CURRENT_SET_BIOMETRIC_VAULT_STORAGE_KEY),
    getPreCurrentSetBiometricSourceAvailability(),
  ]);

  return {
    preCurrentVault,
    sources: {
      preCurrentVault: preCurrentVault != null,
      vaultCredential: availability.vaultCredential,
      directService: availability.directService,
    },
  };
};

const sourceContainsPasswordData = sources =>
  sources.preCurrentVault || sources.directService;

const readSourceData = async ({preCurrentVault, sources}, title) => {
  let data = {};

  if (sources.directService) {
    data = {
      ...data,
      ...validatePasswordMap(await getPreCurrentSetLegacyBiometricData(title)),
    };
  }

  if (sources.preCurrentVault) {
    if (!sources.vaultCredential) {
      throw createMigrationError(
        'Legacy biometric vault exists without its wrapping credential.',
      );
    }
    const credential = await getPreCurrentSetBiometricCredential(title);
    try {
      data = {
        ...data,
        ...validatePasswordMap(
          JSON.parse(
            saltedDecryptMGK(credential, preCurrentVault),
          ),
        ),
      };
    } catch (cause) {
      if (cause?.code === 'BIOMETRIC_MIGRATION_FAILED') throw cause;
      throw createMigrationError(
        'Unable to decrypt the legacy biometric vault.',
        cause,
      );
    }
  }

  return data;
};

const readCurrentDestination = async (status, destination, title) => {
  if (status !== ANDROID_BIOMETRIC_CREDENTIAL_STATUS.VALID) {
    return {credential: null, data: {}};
  }

  const credential = await getBiometricCredential(title);
  if (destination == null) return {credential, data: {}};

  try {
    return {
      credential,
      data: validatePasswordMap(
        JSON.parse(saltedDecryptMGK(credential, destination)),
      ),
    };
  } catch (cause) {
    if (cause?.code === 'BIOMETRIC_MIGRATION_FAILED') throw cause;
    throw createMigrationError(
      'Unable to authenticate the current biometric vault.',
      cause,
    );
  }
};

const discardUnrecoverableDestination = async () => {
  let newFlags = new BigNumber(SecureStorage.flags || 0);
  if (
    newFlags
      .and(SecureStorage.constructor.FLAG_STORE_HAS_BIOMETRIC_VAULT)
      .toNumber()
  ) {
    newFlags = newFlags.xor(
      SecureStorage.constructor.FLAG_STORE_HAS_BIOMETRIC_VAULT,
    );
  }

  // Native status has already proved that this ciphertext has no usable key.
  // Clear it before creating a replacement so a process stop cannot pair a
  // newly durable native key with stale ciphertext. Legacy sources remain.
  await AsyncStorage.removeItem(BIOMETRIC_VAULT_STORAGE_KEY);
  await AsyncStorage.setItem(SECURE_STORE_FLAG_KEY, newFlags.toString());
  const [storedDestination, storedFlags] = await AsyncStorage.multiGet([
    BIOMETRIC_VAULT_STORAGE_KEY,
    SECURE_STORE_FLAG_KEY,
  ]);
  if (
    storedDestination[1] != null ||
    storedFlags[1] !== newFlags.toString()
  ) {
    throw createMigrationError(
      'Unable to clear an unrecoverable biometric destination.',
    );
  }
  SecureStorage.flags = newFlags;
};

const bestEffortRestoreCurrentDestination = async (
  previousDestination,
  previousFlags,
  attemptedDestination,
  attemptedFlags,
) => {
  try {
    const stored = new Map(
      await AsyncStorage.multiGet([
        BIOMETRIC_VAULT_STORAGE_KEY,
        SECURE_STORE_FLAG_KEY,
      ]),
    );
    if (stored.get(BIOMETRIC_VAULT_STORAGE_KEY) === attemptedDestination) {
      if (previousDestination == null) {
        await AsyncStorage.removeItem(BIOMETRIC_VAULT_STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(
          BIOMETRIC_VAULT_STORAGE_KEY,
          previousDestination,
        );
      }
    }
    if (stored.get(SECURE_STORE_FLAG_KEY) === attemptedFlags.toString()) {
      await AsyncStorage.setItem(
        SECURE_STORE_FLAG_KEY,
        previousFlags.toString(),
      );
    }
    SecureStorage.flags = previousFlags;
  } catch (_) {
    // The original destination remains authoritative on the next read. A
    // failed best-effort rollback never authorizes legacy source deletion.
  }
};

const persistAndVerifyDestination = async (
  data,
  existingCredential,
  previousDestination,
  preserveCurrentDestinationOnFailure,
) => {
  const credential =
    existingCredential == null
      ? await generateBiometricCredential()
      : existingCredential;
  const plaintext = canonicalPasswordMap(data);
  const encryptedVault = await saltedEncryptMGK(credential, plaintext);
  if (saltedDecryptMGK(credential, encryptedVault) !== plaintext) {
    throw createMigrationError(
      'Biometric migration destination failed local encryption verification.',
    );
  }

  const storedFlags = await AsyncStorage.getItem(SECURE_STORE_FLAG_KEY);
  const previousFlags = new BigNumber(
    storedFlags == null ? SecureStorage.flags.toString() : storedFlags,
  );
  const newFlags = previousFlags.or(
    SecureStorage.constructor.FLAG_STORE_HAS_BIOMETRIC_VAULT,
  );

  try {
    await AsyncStorage.multiSet([
      [BIOMETRIC_VAULT_STORAGE_KEY, encryptedVault],
      [SECURE_STORE_FLAG_KEY, newFlags.toString()],
    ]);
    SecureStorage.flags = newFlags;

    const stored = new Map(
      await AsyncStorage.multiGet([
        BIOMETRIC_VAULT_STORAGE_KEY,
        SECURE_STORE_FLAG_KEY,
      ]),
    );
    if (
      stored.get(BIOMETRIC_VAULT_STORAGE_KEY) !== encryptedVault ||
      stored.get(SECURE_STORE_FLAG_KEY) !== newFlags.toString()
    ) {
      throw createMigrationError(
        'Biometric migration destination write could not be verified.',
      );
    }

    // Bind cleanup authorization to another prompt-backed read of the native
    // key, then authenticate the exact ciphertext read back from storage.
    const verifiedCredential = await getBiometricCredential(
      'Verify migrated biometric passwords',
    );
    if (verifiedCredential !== credential) {
      throw createMigrationError(
        'Migrated biometric wrapping credential did not round-trip.',
      );
    }
    const verifiedData = validatePasswordMap(
      JSON.parse(
        saltedDecryptMGK(
          verifiedCredential,
          stored.get(BIOMETRIC_VAULT_STORAGE_KEY),
        ),
      ),
    );
    if (canonicalPasswordMap(verifiedData) !== plaintext) {
      throw createMigrationError(
        'Migrated biometric vault data did not round-trip.',
      );
    }
    return verifiedData;
  } catch (cause) {
    if (preserveCurrentDestinationOnFailure) {
      await bestEffortRestoreCurrentDestination(
        previousDestination,
        previousFlags,
        encryptedVault,
        newFlags,
      );
    }
    throw cause;
  }
};

const removeVerifiedSources = async sources => {
  const removals = [];
  if (sources.preCurrentVault) {
    removals.push(async () => {
      await AsyncStorage.removeItem(
        PRE_CURRENT_SET_BIOMETRIC_VAULT_STORAGE_KEY,
      );
      if (sources.vaultCredential) {
        await removePreCurrentSetBiometricCredential();
      }
    });
  } else if (sources.vaultCredential) {
    removals.push(() => removePreCurrentSetBiometricCredential());
  }
  if (sources.directService) {
    removals.push(() => removePreCurrentSetLegacyBiometricData());
  }

  const results = await Promise.allSettled(
    removals.map(remove => Promise.resolve().then(remove)),
  );
  if (results.some(result => result.status === 'rejected')) {
    throw createMigrationError(
      'The new biometric vault was verified, but legacy credential cleanup did not finish.',
    );
  }
};

const migrateUnlocked = async title => {
  await SecureStorage.recoverTransitionUnlocked();
  await SecureStorage.loadStoredFlagsUnlocked();

  const discovered = await discoverSources();
  if (!sourceContainsPasswordData(discovered.sources)) {
    return {migrated: false, data: null};
  }

  // All password plaintext remains in memory. Legacy records are unchanged if
  // any prompt, parse, decrypt, native-key, or destination verification fails.
  const legacyData = await readSourceData(discovered, title);
  let destination = await AsyncStorage.getItem(BIOMETRIC_VAULT_STORAGE_KEY);
  const destinationStatus = await getAndroidBiometricCredentialStatus();
  if (
    destination != null &&
    destinationStatus !== ANDROID_BIOMETRIC_CREDENTIAL_STATUS.VALID
  ) {
    await discardUnrecoverableDestination();
    destination = null;
  }
  const current = await readCurrentDestination(
    destinationStatus,
    destination,
    title,
  );
  const mergedData = {...legacyData, ...current.data};
  const verifiedData = await persistAndVerifyDestination(
    mergedData,
    current.credential,
    destination,
    destinationStatus === ANDROID_BIOMETRIC_CREDENTIAL_STATUS.VALID,
  );

  // Cleanup is the only destructive stage and is unreachable until the new
  // credential and encrypted destination have both round-tripped.
  await removeVerifiedSources(discovered.sources);
  return {migrated: true, data: verifiedData};
};

/**
 * Performs one in-memory Android legacy-to-native migration attempt. There is
 * deliberately no marker or crash-recovery journal: an interrupted attempt
 * leaves legacy data intact, and the user can authenticate with their password.
 */
export const migrateLegacyAndroidBiometricVault = title => {
  if (Platform.OS !== 'android') {
    return Promise.resolve({migrated: false, data: null});
  }

  return SecureStorage.withStoreMutationLock(() => migrateUnlocked(title));
};
