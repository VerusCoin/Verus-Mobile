import {Platform} from 'react-native';
import {migrateLegacyAndroidBiometricVault} from './biometricMigration';
import {
  createBiometricPasswordNotFoundError,
  getLegacyBiometricPassword,
  isBiometricEnrollmentChangedError,
  isBiometricPasswordNotFoundError,
  removeLegacyBiometricPassword,
  storeLegacyBiometricPassword,
} from './keychain';
import {SecureStorage} from './secureStore';

// iOS continues to store its small password map directly in Keychain. Android
// uses an encrypted AsyncStorage vault because its Keychain implementation has
// a much smaller payload limit.

const androidBiometricVaultExists = () => SecureStorage.hasBiometricVault();

export const isBiometricPasswordUnavailableError = error =>
  isBiometricPasswordNotFoundError(error) ||
  isBiometricEnrollmentChangedError(error);

export const getBiometricPassword = async (accountHash, title) => {
  if (Platform.OS === 'ios') {
    return getLegacyBiometricPassword(accountHash, title);
  }

  const migration = await migrateLegacyAndroidBiometricVault(title);
  if (migration.data != null) {
    if (Object.prototype.hasOwnProperty.call(migration.data, accountHash)) {
      return migration.data[accountHash];
    }
    throw createBiometricPasswordNotFoundError(accountHash);
  }

  if (!(await androidBiometricVaultExists())) {
    throw createBiometricPasswordNotFoundError(accountHash);
  }

  try {
    return await SecureStorage.getPasswordFromBiometricVault(accountHash);
  } catch (error) {
    // Only a confirmed missing/permanently-invalidated enrollment key may
    // erase the current vault. Cancellations, lockouts, lifecycle failures,
    // and transient Keystore/backend errors preserve it for a later retry.
    if (isBiometricEnrollmentChangedError(error)) {
      await SecureStorage.invalidateCurrentSetBiometricVault();
    }
    throw error;
  }
};

export const storeBiometricPassword = async (accountHash, password) => {
  if (Platform.OS === 'ios') {
    return storeLegacyBiometricPassword(accountHash, password);
  }

  await migrateLegacyAndroidBiometricVault(
    'Authenticate to store password in biometric vault',
  );

  return SecureStorage.storePasswordInBiometricVaultAtomic(
    accountHash,
    password,
  );
};

export const removeBiometricPassword = async accountHash => {
  if (Platform.OS === 'ios') {
    return removeLegacyBiometricPassword(accountHash);
  }

  await migrateLegacyAndroidBiometricVault(
    'Authenticate to remove password from biometric vault',
  );
  if (!(await androidBiometricVaultExists())) return;
  return SecureStorage.removePasswordFromBiometricVault(accountHash);
};
