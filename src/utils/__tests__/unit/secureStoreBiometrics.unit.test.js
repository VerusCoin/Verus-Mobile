import AsyncStorage from '@react-native-async-storage/async-storage';
import {Buffer} from 'buffer';
import * as Keychain from 'react-native-keychain';
import {NativeModules, Platform} from 'react-native';
import {BigNumber} from 'verus-typescript-primitives';
import {saltedDecryptMGK} from '../../crypto/crypto';
import {BIOMETRIC_PASSWORD_NOT_FOUND_ERROR_CODE} from '../../keychain/keychain';
import {SecureStorage} from '../../keychain/secureStore';

describe('secure store biometric vault', () => {
  const originalPlatform = Platform.OS;
  let nativeCredential;

  beforeEach(async () => {
    Platform.OS = 'android';
    await AsyncStorage.clear();
    SecureStorage.flags = new BigNumber(0);
    SecureStorage.mutationCoordinator.queue = Promise.resolve();
    nativeCredential = null;
    Keychain.getGenericPassword.mockReset();
    Keychain.resetGenericPassword.mockReset();
    Keychain.getGenericPassword.mockResolvedValue({
      password: 'mock-biometric-credential',
    });
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
    NativeModules.VerusBiometricEnrollment.removeEnrollmentBoundCredential.mockImplementation(
      () => {
        nativeCredential = null;
        return Promise.resolve(true);
      },
    );
  });

  afterAll(() => {
    Platform.OS = originalPlatform;
  });

  it('updates the in-memory biometry flag when creating a vault', async () => {
    expect(SecureStorage.biometryFlagSet()).toBe(false);

    await SecureStorage.storePasswordInBiometricVaultAtomic(
      'accountHash',
      'password',
    );

    expect(SecureStorage.biometryFlagSet()).toBe(true);
    expect(await SecureStorage.hasBiometricVault()).toBe(true);
    expect(await AsyncStorage.getItem('secureStoreFlags')).toBe('2');
  });

  it('uses an existing vault when the in-memory flag is stale', async () => {
    await SecureStorage.storePasswordInBiometricVaultAtomic(
      'firstAccount',
      'first-password',
    );
    SecureStorage.flags = new BigNumber(0);

    expect(SecureStorage.biometryFlagSet()).toBe(false);
    expect(await SecureStorage.hasBiometricVault()).toBe(true);

    await SecureStorage.storePasswordInBiometricVaultAtomic(
      'secondAccount',
      'second-password',
    );

    expect(SecureStorage.biometryFlagSet()).toBe(true);
    expect(
      await SecureStorage.getPasswordFromBiometricVault('firstAccount'),
    ).toBe('first-password');
    expect(
      await SecureStorage.getPasswordFromBiometricVault('secondAccount'),
    ).toBe('second-password');
  });

  it('reports a missing account without treating a readable vault as corrupt', async () => {
    await SecureStorage.storePasswordInBiometricVaultAtomic(
      'otherAccount',
      'other-password',
    );

    await expect(
      SecureStorage.getPasswordFromBiometricVault('selectedAccount'),
    ).rejects.toMatchObject({
      code: BIOMETRIC_PASSWORD_NOT_FOUND_ERROR_CODE,
      accountHash: 'selectedAccount',
    });
  });

  it('does not classify unreadable vault data as a missing account', async () => {
    await SecureStorage.storePasswordInBiometricVaultAtomic(
      'selectedAccount',
      'password',
    );
    await AsyncStorage.setItem(
      'biometricVaultEnrollmentBoundV2',
      'unreadable-vault-data',
    );

    const error = await SecureStorage.getPasswordFromBiometricVault(
      'selectedAccount',
    ).catch(caught => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error.code).not.toBe(BIOMETRIC_PASSWORD_NOT_FOUND_ERROR_CODE);
    expect(error.message).toContain('Unable to decrypt or parse');
  });

  it('does not treat a legacy vault as the enrollment-bound destination', async () => {
    await AsyncStorage.setItem(
      'biometricVault',
      'legacy-encrypted-password-vault',
    );

    expect(await SecureStorage.hasBiometricVault()).toBe(false);
    expect(await AsyncStorage.getItem('biometricVault')).toBe(
      'legacy-encrypted-password-vault',
    );
  });

  it('removes the current vault and clears its flag after enrollment changes', async () => {
    await AsyncStorage.setItem(
      'biometricVaultEnrollmentBoundV2',
      'encrypted-current-vault',
    );
    await AsyncStorage.setItem('secureStoreFlags', '2');
    SecureStorage.flags = new BigNumber(2);

    await SecureStorage.invalidateCurrentSetBiometricVault();

    expect(
      await AsyncStorage.getItem('biometricVaultEnrollmentBoundV2'),
    ).toBeNull();
    expect(await AsyncStorage.getItem('secureStoreFlags')).toBe('0');
    await expect(SecureStorage.hasBiometricVault()).resolves.toBe(false);
  });

  it('serializes concurrent first enablement without replacing the native credential', async () => {
    await Promise.all([
      SecureStorage.storePasswordInBiometricVaultAtomic(
        'firstAccount',
        'first-password',
      ),
      SecureStorage.storePasswordInBiometricVaultAtomic(
        'secondAccount',
        'second-password',
      ),
    ]);

    expect(
      NativeModules.VerusBiometricEnrollment.setEnrollmentBoundCredential,
    ).toHaveBeenCalledTimes(1);
    const encryptedVault = await AsyncStorage.getItem(
      'biometricVaultEnrollmentBoundV2',
    );
    expect(
      JSON.parse(saltedDecryptMGK(nativeCredential, encryptedVault)),
    ).toEqual({
      firstAccount: 'first-password',
      secondAccount: 'second-password',
    });
  });

  it('re-enables from the supplied account after enrollment invalidates an old vault', async () => {
    nativeCredential = Buffer.alloc(128, 3).toString('base64');
    const inaccessibleVault = 'ciphertext-for-the-invalidated-key';
    await AsyncStorage.multiSet([
      ['biometricVaultEnrollmentBoundV2', inaccessibleVault],
      ['secureStoreFlags', '3'],
    ]);
    SecureStorage.flags = new BigNumber(3);
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredentialStatus.mockResolvedValueOnce(
      'INVALIDATED',
    );

    await SecureStorage.storePasswordInBiometricVaultAtomic(
      'currentAccount',
      'verified-current-password',
    );

    expect(
      NativeModules.VerusBiometricEnrollment.setEnrollmentBoundCredential,
    ).toHaveBeenCalledTimes(1);
    const replacementVault = await AsyncStorage.getItem(
      'biometricVaultEnrollmentBoundV2',
    );
    expect(replacementVault).not.toBe(inaccessibleVault);
    expect(
      JSON.parse(saltedDecryptMGK(nativeCredential, replacementVault)),
    ).toEqual({currentAccount: 'verified-current-password'});
    // Preserve the global encryption bit while restoring the biometric bit.
    expect(await AsyncStorage.getItem('secureStoreFlags')).toBe('3');
  });

  it('preserves an existing vault when enrollment status fails transiently', async () => {
    const existingVault = 'preserve-on-transient-status-error';
    await AsyncStorage.multiSet([
      ['biometricVaultEnrollmentBoundV2', existingVault],
      ['secureStoreFlags', '2'],
    ]);
    SecureStorage.flags = new BigNumber(2);
    NativeModules.VerusBiometricEnrollment.getEnrollmentBoundCredentialStatus.mockRejectedValueOnce(
      Object.assign(new Error('keystore backend busy'), {
        code: 'E_BIOMETRIC_ENROLLMENT_KEY_RETRYABLE',
      }),
    );

    await expect(
      SecureStorage.storePasswordInBiometricVaultAtomic(
        'currentAccount',
        'verified-current-password',
      ),
    ).rejects.toMatchObject({
      code: 'BIOMETRIC_ENROLLMENT_PROTECTION_UNAVAILABLE',
    });

    expect(await AsyncStorage.getItem('biometricVaultEnrollmentBoundV2')).toBe(
      existingVault,
    );
    expect(await AsyncStorage.getItem('secureStoreFlags')).toBe('2');
    expect(
      NativeModules.VerusBiometricEnrollment.setEnrollmentBoundCredential,
    ).not.toHaveBeenCalled();
  });
});
