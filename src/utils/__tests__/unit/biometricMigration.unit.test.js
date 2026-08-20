import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {NativeModules, Platform} from 'react-native';
import {BigNumber} from 'verus-typescript-primitives';
import {migrateLegacyAndroidBiometricVault} from '../../keychain/biometricMigration';
import {getBiometricPassword} from '../../keychain/biometrics';
import {BIOMETRIC_PASSWORD_NOT_FOUND_ERROR_CODE} from '../../keychain/keychain';
import {saltedDecryptMGK, saltedEncryptMGK} from '../../crypto/crypto';
import {SecureStorage} from '../../keychain/secureStore';

const NATIVE_VAULT_KEY = 'biometricVaultEnrollmentBoundV2';
const OLD_VAULT_KEY = 'biometricVault';

const allSourceServices = [
  'Verus_Mobile_Biometric',
  'com.verus.verusmobile',
];

describe('Android biometric enrollment-bound migration', () => {
  const originalPlatform = Platform.OS;
  let nativeCredential;

  beforeEach(async () => {
    Platform.OS = 'android';
    await AsyncStorage.clear();
    SecureStorage.flags = new BigNumber(0);
    SecureStorage.mutationCoordinator.queue = Promise.resolve();
    nativeCredential = null;

    Keychain.getAllGenericPasswordServices.mockReset();
    Keychain.getGenericPassword.mockReset();
    Keychain.resetGenericPassword.mockReset();
    Keychain.getAllGenericPasswordServices.mockResolvedValue([]);
    Keychain.resetGenericPassword.mockResolvedValue(true);

    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredentialStatus.mockReset();
    NativeModules.VerusBiometricEnrollment.setEnrollmentBoundCredential.mockReset();
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredential.mockReset();
    NativeModules.VerusBiometricEnrollment.removeEnrollmentBoundCredential.mockReset();
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredentialStatus.mockImplementation(
      () => Promise.resolve(nativeCredential == null ? 'MISSING' : 'VALID'),
    );
    NativeModules.VerusBiometricEnrollment.setEnrollmentBoundCredential.mockImplementation(
      value => {
        nativeCredential = value;
        return Promise.resolve(true);
      },
    );
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredential.mockImplementation(
      () => Promise.resolve(nativeCredential),
    );
    NativeModules.VerusBiometricEnrollment.removeEnrollmentBoundCredential.mockResolvedValue(
      true,
    );
  });

  afterAll(() => {
    Platform.OS = originalPlatform;
  });

  it('keeps all legacy data until the in-memory merge and destination verification finish', async () => {
    const oldVaultCredential = 'old-vault-credential';
    const oldVault = await saltedEncryptMGK(
      oldVaultCredential,
      JSON.stringify({oldVault: 'old-vault-password', overlap: 'old-vault'}),
    );
    await AsyncStorage.multiSet([
      [OLD_VAULT_KEY, oldVault],
      ['secureStoreFlags', '1'],
    ]);
    SecureStorage.flags = new BigNumber(1);
    Keychain.getAllGenericPasswordServices.mockResolvedValue(allSourceServices);
    Keychain.getGenericPassword.mockImplementation(({service}) => {
      const passwords = {
        Verus_Mobile_Biometric: oldVaultCredential,
        'com.verus.verusmobile': JSON.stringify({
          oldDirect: 'old-direct-password',
          overlap: 'old-direct',
        }),
      };
      return Promise.resolve({password: passwords[service]});
    });
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredential.mockImplementation(
      async () => {
        expect(await AsyncStorage.getItem(OLD_VAULT_KEY)).toBe(oldVault);
        expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();
        return nativeCredential;
      },
    );

    const result = await migrateLegacyAndroidBiometricVault(
      'Authenticate legacy biometric data',
    );

    expect(result).toEqual({
      migrated: true,
      data: {
        oldDirect: 'old-direct-password',
        oldVault: 'old-vault-password',
        overlap: 'old-vault',
      },
    });
    const destination = await AsyncStorage.getItem(NATIVE_VAULT_KEY);
    expect(JSON.parse(saltedDecryptMGK(nativeCredential, destination))).toEqual(
      result.data,
    );
    expect(await AsyncStorage.getItem(OLD_VAULT_KEY)).toBeNull();
    expect(await AsyncStorage.getItem('secureStoreFlags')).toBe('3');
    expect(
      Keychain.resetGenericPassword.mock.calls
        .map(([options]) => options.service)
        .sort(),
    ).toEqual([...allSourceServices].sort());
    expect(
      (await AsyncStorage.getAllKeys()).filter(key =>
        key.toLowerCase().includes('migration'),
      ),
    ).toEqual([]);
  });

  it('does not delete legacy sources when destination credential verification fails', async () => {
    const oldCredential = 'old-vault-credential';
    const oldVault = await saltedEncryptMGK(
      oldCredential,
      JSON.stringify({account: 'password'}),
    );
    await AsyncStorage.setItem(OLD_VAULT_KEY, oldVault);
    Keychain.getAllGenericPasswordServices.mockResolvedValue([
      'Verus_Mobile_Biometric',
    ]);
    Keychain.getGenericPassword.mockResolvedValue({password: oldCredential});
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredential.mockResolvedValue(
      'wrong-native-credential',
    );

    await expect(
      migrateLegacyAndroidBiometricVault('Authenticate legacy biometric data'),
    ).rejects.toMatchObject({code: 'BIOMETRIC_MIGRATION_FAILED'});

    expect(await AsyncStorage.getItem(OLD_VAULT_KEY)).toBe(oldVault);
    expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();
    expect(
      (await AsyncStorage.getAllKeys()).filter(key =>
        key.toLowerCase().includes('migration'),
      ),
    ).toEqual([]);
  });

  it('never replaces or weakens a valid V2 destination when verification is cancelled', async () => {
    const existingCredential = 'existing-native-credential';
    const destination = await saltedEncryptMGK(
      existingCredential,
      JSON.stringify({v2Only: 'must-survive'}),
    );
    const oldCredential = 'old-vault-credential';
    const oldVault = await saltedEncryptMGK(
      oldCredential,
      JSON.stringify({legacyOnly: 'also-survives'}),
    );
    await AsyncStorage.multiSet([
      [NATIVE_VAULT_KEY, destination],
      [OLD_VAULT_KEY, oldVault],
      ['secureStoreFlags', '2'],
    ]);
    SecureStorage.flags = new BigNumber(2);
    nativeCredential = existingCredential;
    Keychain.getAllGenericPasswordServices.mockResolvedValue([
      'Verus_Mobile_Biometric',
    ]);
    Keychain.getGenericPassword.mockResolvedValue({password: oldCredential});
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredential
      .mockResolvedValueOnce(existingCredential)
      .mockRejectedValueOnce(
        Object.assign(new Error('verification prompt cancelled'), {
          code: 'E_BIOMETRIC_AUTH_CANCELLED',
        }),
      );

    await expect(
      migrateLegacyAndroidBiometricVault('Authenticate legacy biometric data'),
    ).rejects.toMatchObject({code: 'E_BIOMETRIC_AUTH_CANCELLED'});

    expect(
      NativeModules.VerusBiometricEnrollment.setEnrollmentBoundCredential,
    ).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(NATIVE_VAULT_KEY)).toBe(destination);
    expect(await AsyncStorage.getItem(OLD_VAULT_KEY)).toBe(oldVault);
    expect(await AsyncStorage.getItem('secureStoreFlags')).toBe('2');
    expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();
  });

  it('merges legacy data into an existing valid V2 vault using the existing native key', async () => {
    const existingCredential = 'existing-native-credential';
    const destination = await saltedEncryptMGK(
      existingCredential,
      JSON.stringify({v2Only: 'current', overlap: 'current-wins'}),
    );
    const oldCredential = 'old-vault-credential';
    const oldVault = await saltedEncryptMGK(
      oldCredential,
      JSON.stringify({legacyOnly: 'legacy', overlap: 'legacy-loses'}),
    );
    await AsyncStorage.multiSet([
      [NATIVE_VAULT_KEY, destination],
      [OLD_VAULT_KEY, oldVault],
      ['secureStoreFlags', '2'],
    ]);
    SecureStorage.flags = new BigNumber(2);
    nativeCredential = existingCredential;
    Keychain.getAllGenericPasswordServices.mockResolvedValue([
      'Verus_Mobile_Biometric',
    ]);
    Keychain.getGenericPassword.mockResolvedValue({password: oldCredential});

    const result = await migrateLegacyAndroidBiometricVault(
      'Authenticate legacy biometric data',
    );

    expect(result.data).toEqual({
      legacyOnly: 'legacy',
      overlap: 'current-wins',
      v2Only: 'current',
    });
    expect(
      NativeModules.VerusBiometricEnrollment.setEnrollmentBoundCredential,
    ).not.toHaveBeenCalled();
    const mergedDestination = await AsyncStorage.getItem(NATIVE_VAULT_KEY);
    expect(
      JSON.parse(saltedDecryptMGK(existingCredential, mergedDestination)),
    ).toEqual(result.data);
    expect(await AsyncStorage.getItem(OLD_VAULT_KEY)).toBeNull();
  });

  it('removes only a status-proven unrecoverable destination before native key replacement', async () => {
    const oldCredential = 'old-vault-credential';
    const oldVault = await saltedEncryptMGK(
      oldCredential,
      JSON.stringify({legacyOnly: 'survives'}),
    );
    await AsyncStorage.multiSet([
      [OLD_VAULT_KEY, oldVault],
      [NATIVE_VAULT_KEY, 'ciphertext-for-an-invalidated-native-key'],
      ['secureStoreFlags', '3'],
    ]);
    SecureStorage.flags = new BigNumber(3);
    Keychain.getAllGenericPasswordServices.mockResolvedValue([
      'Verus_Mobile_Biometric',
    ]);
    Keychain.getGenericPassword.mockResolvedValue({password: oldCredential});
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredentialStatus.mockResolvedValueOnce(
      'INVALIDATED',
    );
    const simulatedStop = new Error('process stopped after native key write');
    NativeModules.VerusBiometricEnrollment.setEnrollmentBoundCredential.mockImplementationOnce(
      value => {
        nativeCredential = value;
        return Promise.reject(simulatedStop);
      },
    );

    await expect(
      migrateLegacyAndroidBiometricVault('Authenticate legacy biometric data'),
    ).rejects.toBe(simulatedStop);

    expect(await AsyncStorage.getItem(OLD_VAULT_KEY)).toBe(oldVault);
    expect(await AsyncStorage.getItem(NATIVE_VAULT_KEY)).toBeNull();
    expect(await AsyncStorage.getItem('secureStoreFlags')).toBe('1');
    expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();

    await expect(
      migrateLegacyAndroidBiometricVault('Authenticate legacy biometric data'),
    ).resolves.toMatchObject({
      migrated: true,
      data: {legacyOnly: 'survives'},
    });
    expect(
      NativeModules.VerusBiometricEnrollment.setEnrollmentBoundCredential,
    ).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(OLD_VAULT_KEY)).toBeNull();
  });

  it('requires retry when cleanup fails but retains the verified V2 destination', async () => {
    const directData = {account: 'password'};
    Keychain.getAllGenericPasswordServices.mockResolvedValue([
      'com.verus.verusmobile',
    ]);
    Keychain.getGenericPassword.mockResolvedValue({
      password: JSON.stringify(directData),
    });
    Keychain.resetGenericPassword.mockRejectedValue(
      new Error('keychain cleanup failed'),
    );

    await expect(
      migrateLegacyAndroidBiometricVault('Authenticate legacy biometric data'),
    ).rejects.toMatchObject({code: 'BIOMETRIC_MIGRATION_FAILED'});

    const destination = await AsyncStorage.getItem(NATIVE_VAULT_KEY);
    expect(JSON.parse(saltedDecryptMGK(nativeCredential, destination))).toEqual(
      directData,
    );
    expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
      service: 'com.verus.verusmobile',
    });
  });

  it('keeps a vault wrapping credential when deleting its ciphertext fails', async () => {
    const oldCredential = 'old-vault-credential';
    const oldVault = await saltedEncryptMGK(
      oldCredential,
      JSON.stringify({account: 'password'}),
    );
    await AsyncStorage.setItem(OLD_VAULT_KEY, oldVault);
    Keychain.getAllGenericPasswordServices.mockResolvedValue([
      'Verus_Mobile_Biometric',
    ]);
    Keychain.getGenericPassword.mockResolvedValue({password: oldCredential});
    AsyncStorage.removeItem.mockImplementationOnce(key => {
      expect(key).toBe(OLD_VAULT_KEY);
      return Promise.reject(new Error('vault cleanup failed'));
    });

    await expect(
      migrateLegacyAndroidBiometricVault('Authenticate legacy biometric data'),
    ).rejects.toMatchObject({code: 'BIOMETRIC_MIGRATION_FAILED'});

    expect(await AsyncStorage.getItem(OLD_VAULT_KEY)).toBe(oldVault);
    expect(Keychain.resetGenericPassword).not.toHaveBeenCalledWith({
      service: 'Verus_Mobile_Biometric',
    });

    await expect(
      migrateLegacyAndroidBiometricVault('Authenticate legacy biometric data'),
    ).resolves.toMatchObject({
      migrated: true,
      data: {account: 'password'},
    });
    expect(await AsyncStorage.getItem(OLD_VAULT_KEY)).toBeNull();
    expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
      service: 'Verus_Mobile_Biometric',
    });
  });

  it('preserves both current and legacy data on a retryable Keystore status failure', async () => {
    const currentVault = 'encrypted-current-vault';
    const legacyData = JSON.stringify({account: 'legacy-password'});
    await AsyncStorage.multiSet([
      [NATIVE_VAULT_KEY, currentVault],
      ['secureStoreFlags', '2'],
    ]);
    SecureStorage.flags = new BigNumber(2);
    Keychain.getAllGenericPasswordServices.mockResolvedValue([
      'com.verus.verusmobile',
    ]);
    Keychain.getGenericPassword.mockResolvedValue({password: legacyData});
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredentialStatus.mockRejectedValue(
      Object.assign(new Error('keystore backend busy'), {
        code: 'E_BIOMETRIC_ENROLLMENT_KEY_RETRYABLE',
      }),
    );

    await expect(getBiometricPassword('account')).rejects.toMatchObject({
      code: 'BIOMETRIC_ENROLLMENT_PROTECTION_UNAVAILABLE',
    });

    expect(await AsyncStorage.getItem(NATIVE_VAULT_KEY)).toBe(currentVault);
    expect(await AsyncStorage.getItem('secureStoreFlags')).toBe('2');
    expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();
    expect(
      NativeModules.VerusBiometricEnrollment.removeEnrollmentBoundCredential,
    ).not.toHaveBeenCalled();
  });

  it('does nothing when no legacy password source exists', async () => {
    Keychain.getAllGenericPasswordServices.mockResolvedValue([
      'Verus_Mobile_Biometric',
    ]);

    await expect(
      migrateLegacyAndroidBiometricVault('Authenticate legacy biometric data'),
    ).resolves.toEqual({migrated: false, data: null});

    expect(
      NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredentialStatus,
    ).not.toHaveBeenCalled();
    expect(
      NativeModules.VerusBiometricEnrollment.setEnrollmentBoundCredential,
    ).not.toHaveBeenCalled();
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('reports a missing Android biometric vault for the selected account', async () => {
    await expect(getBiometricPassword('selectedAccount')).rejects.toMatchObject({
      code: BIOMETRIC_PASSWORD_NOT_FOUND_ERROR_CODE,
      accountHash: 'selectedAccount',
    });
  });

  it('reports a selected account missing from successfully migrated Android data', async () => {
    Keychain.getAllGenericPasswordServices.mockResolvedValue([
      'com.verus.verusmobile',
    ]);
    Keychain.getGenericPassword.mockResolvedValue({
      password: JSON.stringify({otherAccount: 'other-password'}),
    });

    await expect(getBiometricPassword('selectedAccount')).rejects.toMatchObject({
      code: BIOMETRIC_PASSWORD_NOT_FOUND_ERROR_CODE,
      accountHash: 'selectedAccount',
    });

    expect(
      NativeModules.VerusBiometricEnrollment.setEnrollmentBoundCredential,
    ).toHaveBeenCalledTimes(1);
  });
});
