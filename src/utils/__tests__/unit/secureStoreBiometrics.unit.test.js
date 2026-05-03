import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {BigNumber} from 'verus-typescript-primitives';
import {SecureStorage} from '../../keychain/secureStore';

describe('secure store biometric vault', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    SecureStorage.flags = new BigNumber(0);
    Keychain.getGenericPassword.mockReset();
    Keychain.getGenericPassword.mockResolvedValue({
      password: 'mock-biometric-credential',
    });
  });

  it('updates the in-memory biometry flag when creating a vault', async () => {
    expect(SecureStorage.biometryFlagSet()).toBe(false);

    await SecureStorage.setBiometricVaultData({
      accountHash: 'password',
    });

    expect(SecureStorage.biometryFlagSet()).toBe(true);
    expect(await SecureStorage.hasBiometricVault()).toBe(true);
    expect(await AsyncStorage.getItem('secureStoreFlags')).toBe('2');
  });

  it('uses an existing vault when the in-memory flag is stale', async () => {
    await SecureStorage.setBiometricVaultData({
      firstAccount: 'first-password',
    });
    SecureStorage.flags = new BigNumber(0);

    expect(SecureStorage.biometryFlagSet()).toBe(false);
    expect(await SecureStorage.hasBiometricVault()).toBe(true);

    await SecureStorage.setPasswordInBiometricVault(
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
});
