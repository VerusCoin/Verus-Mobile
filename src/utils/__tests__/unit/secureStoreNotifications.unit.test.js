import AsyncStorage from '@react-native-async-storage/async-storage';
import {BigNumber} from 'verus-typescript-primitives';
import {
  NOTIFICATIONS_STORAGE_INTERNAL_KEY,
  USER_DATA_STORAGE_INTERNAL_KEY,
} from '../../../../env';
import {saltedEncryptMGK} from '../../crypto/crypto';
import {SecureStorage} from '../../keychain/secureStore';

describe('secure notification storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    SecureStorage.credential = null;
    SecureStorage.flags = new BigNumber(0);
  });

  it('migrates notification history written in plaintext by an older release', async () => {
    const notifications = JSON.stringify({
      directory: {
        request: {
          uri: 'vrsc://request-containing-sensitive-spendable-key',
        },
      },
      accounts: {},
    });

    await AsyncStorage.multiSet([
      ['secureStoreFlags', '1'],
      [NOTIFICATIONS_STORAGE_INTERNAL_KEY, notifications],
    ]);

    await SecureStorage.initialize('device-secure-storage-credential');

    expect(
      await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_INTERNAL_KEY),
    ).not.toBe(notifications);
    await expect(
      SecureStorage.getItem(NOTIFICATIONS_STORAGE_INTERNAL_KEY),
    ).resolves.toBe(notifications);
  });

  it('preserves unknown notification data without blocking valid wallet data', async () => {
    const credential = 'device-secure-storage-credential';
    const users = JSON.stringify({users: [{id: 'wallet'}]});
    const encryptedUsers = await saltedEncryptMGK(credential, users);
    const malformedNotifications = '{malformed-notification-history';
    await AsyncStorage.multiSet([
      ['secureStoreFlags', '1'],
      [USER_DATA_STORAGE_INTERNAL_KEY, encryptedUsers],
      [NOTIFICATIONS_STORAGE_INTERNAL_KEY, malformedNotifications],
    ]);

    await expect(SecureStorage.initialize(credential)).resolves.toBeUndefined();
    await expect(
      SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY),
    ).resolves.toBe(users);

    expect(
      await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_INTERNAL_KEY),
    ).toBe(malformedNotifications);
    await expect(
      SecureStorage.getItem(NOTIFICATIONS_STORAGE_INTERNAL_KEY),
    ).rejects.toThrow('Unable to decrypt encrypted wallet data');
  });
});
