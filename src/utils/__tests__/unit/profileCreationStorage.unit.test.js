import AsyncStorage from '@react-native-async-storage/async-storage';
import {USER_DATA_STORAGE_INTERNAL_KEY} from '../../../../env/index';
import {storeUser} from '../../asyncStore/authDataStorage';
import {hashAccountId} from '../../crypto/hash';
import {SecureStorage} from '../../keychain/secureStore';
import * as seedCrypt from '../../seedCrypt';

const profile = (userName = 'Import fixture') => ({
  userName,
  password: 'fixture password',
  seeds: {electrum: 'fixture public seed', dlight_private: 'fixture private seed'},
});

const storedRecord = async () => JSON.parse(
  await SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY),
);

describe('atomic profile creation', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await AsyncStorage.clear();
  });

  afterEach(() => jest.restoreAllMocks());

  it('saves only the first concurrent same-name submission with stale account lists', async () => {
    const original = profile();
    const encrypt = jest.spyOn(seedCrypt, 'encryptkey');
    const write = jest.spyOn(SecureStorage, 'setItem');
    const staleAccounts = [];
    const results = await Promise.allSettled([
      storeUser(original, staleAccounts),
      storeUser({...original, password: 'other password', seeds: {electrum: 'other seed'}}, staleAccounts),
      storeUser(original, staleAccounts),
    ]);

    expect(results[0].status).toBe('fulfilled');
    for (const result of results.slice(1)) {
      expect(result.status).toBe('rejected');
      expect(result.reason).toMatchObject({code: 'DUPLICATE_ACCOUNT'});
    }
    const {users} = await storedRecord();
    expect(users).toEqual(results[0].value);
    expect(users).toHaveLength(1);
    expect(users[0].accountHash).toBe(hashAccountId(original.userName));
    for (const [channel, seed] of Object.entries(original.seeds)) {
      expect(seedCrypt.decryptkey(original.password, users[0].encryptedKeys[channel])).toBe(seed);
    }
    expect(encrypt).toHaveBeenCalledTimes(2);
    expect(write.mock.calls.filter(([key]) => key === USER_DATA_STORAGE_INTERNAL_KEY)).toHaveLength(1);
    expect(staleAccounts).toEqual([]);
  });

  it('rejects a stale retry without changing ciphertext, and permits a later valid creation', async () => {
    const original = profile();
    await storeUser(original, []);
    const before = await SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY);
    const encrypt = jest.spyOn(seedCrypt, 'encryptkey');
    const write = jest.spyOn(SecureStorage, 'setItem');

    await expect(storeUser({...original, password: 'replacement password'}, []))
      .rejects.toMatchObject({code: 'DUPLICATE_ACCOUNT'});
    expect(await SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY)).toBe(before);
    expect(encrypt).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();

    const nextUsers = await storeUser(profile('Second fixture'), []);
    expect(nextUsers.map(user => user.id)).toEqual(['Import fixture', 'Second fixture']);
    expect(nextUsers[0]).toEqual(JSON.parse(before).users[0]);
    expect((await storedRecord()).users).toEqual(nextUsers);
  });

  it('preserves both distinct concurrent creations and existing storage metadata', async () => {
    await SecureStorage.setItem(USER_DATA_STORAGE_INTERNAL_KEY, JSON.stringify({
      users: [],
      futureMetadata: {version: 2},
    }));
    await Promise.all([
      storeUser(profile('First fixture'), []),
      storeUser(profile('Second fixture'), []),
    ]);

    const record = await storedRecord();
    expect(record.users.map(user => user.id)).toEqual(['First fixture', 'Second fixture']);
    expect(record.futureMetadata).toEqual({version: 2});
  });

  it('also rejects duplicates in the caller fallback when no durable user list exists', async () => {
    const existing = {
      id: 'Import fixture',
      accountHash: hashAccountId('Import fixture'),
      encryptedKeys: {electrum: 'original ciphertext'},
    };
    const encrypt = jest.spyOn(seedCrypt, 'encryptkey');

    await expect(storeUser(profile(), [existing]))
      .rejects.toMatchObject({code: 'DUPLICATE_ACCOUNT'});
    expect(encrypt).not.toHaveBeenCalled();
    expect(await SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY)).toBeNull();
    expect(existing.encryptedKeys.electrum).toBe('original ciphertext');
  });

  it('uses a durable empty list instead of stale caller data after a profile was removed', async () => {
    await SecureStorage.setItem(USER_DATA_STORAGE_INTERNAL_KEY, JSON.stringify({users: []}));
    const staleAccounts = [{id: 'Import fixture', accountHash: hashAccountId('Import fixture')}];

    const users = await storeUser(profile(), staleAccounts);

    expect(users).toHaveLength(1);
    expect(users[0].id).toBe('Import fixture');
    expect(users[0].encryptedKeys.electrum).toBeDefined();
    expect((await storedRecord()).users).toEqual(users);
  });
});
