jest.mock('../../../actions/actions/coins/Coins', () => ({
  ...jest.requireActual('../../../actions/actions/coins/Coins'),
  addCoin: jest.fn(),
}));
jest.mock('../../../actions/actionDispatchers', () => ({
  ...jest.requireActual('../../../actions/actionDispatchers'),
  initializeAccountData: jest.fn(),
}));
jest.mock('../../keys', () => ({
  ...jest.requireActual('../../keys'),
  deriveKeyPair: jest.fn(),
}));
jest.mock('../../keychain/biometrics', () => ({
  ...jest.requireActual('../../keychain/biometrics'),
  storeBiometricPassword: jest.fn(),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const {USER_DATA_STORAGE_INTERNAL_KEY} = require('../../../../env');
const {addCoin, setAccounts} = require('../../../actions/actionCreators');
const {initializeAccountData} = require('../../../actions/actionDispatchers');
const store = require('../../../store').default;
const {storeUser} = require('../../asyncStore/authDataStorage');
const {hashAccountId} = require('../../crypto/hash');
const {storeBiometricPassword} = require('../../keychain/biometrics');
const {SecureStorage} = require('../../keychain/secureStore');
const {deriveKeyPair} = require('../../keys');
const {createProfileFromSeed} = require('../../profile/createProfileFromSeed');
const {decryptkey} = require('../../seedCrypt');
const {BIOMETRIC_AUTH} = require('../../constants/storeType');

const profileName = 'Biometric import fixture';
const password = 'fixture password';
const seed = 'fixture seed';
const accountHash = hashAccountId(profileName);
const storedUsers = async () => JSON.parse(
  await SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY),
).users;

describe('profile creation biometric setup', () => {
  let dispatch;

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    store.dispatch(setAccounts([]));
    dispatch = jest.fn(action => store.dispatch(action));
    addCoin.mockResolvedValue({type: 'fixture-add-coin'});
    deriveKeyPair.mockResolvedValue({});
    initializeAccountData.mockResolvedValue(undefined);
    storeBiometricPassword.mockReset().mockResolvedValue(undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  const createProfile = options => createProfileFromSeed({
    profileName,
    password,
    seed,
    accounts: [],
    activeCoinList: {},
    dispatch,
    useBiometrics: true,
    ...options,
  });

  it('never touches an existing biometric credential when a stale duplicate is rejected', async () => {
    await storeUser({
      userName: profileName,
      password: 'original password',
      seeds: {electrum: 'original seed'},
      biometry: true,
    }, []);
    const before = await SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY);

    await expect(createProfile()).rejects.toMatchObject({code: 'DUPLICATE_ACCOUNT'});

    expect(storeBiometricPassword).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(addCoin).not.toHaveBeenCalled();
    expect(initializeAccountData).not.toHaveBeenCalled();
    expect(await SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY)).toBe(before);
  });

  it('persists biometric success using the latest account list and initializes with updated metadata', async () => {
    await SecureStorage.setItem(USER_DATA_STORAGE_INTERNAL_KEY, JSON.stringify({
      users: [],
      futureMetadata: {version: 2},
    }));
    let savedBeforeBiometrics;
    storeBiometricPassword.mockImplementation(async () => {
      savedBeforeBiometrics = (await storedUsers())[0];
      // Another profile may be created while the native biometric prompt is open.
      await storeUser({
        userName: 'Other fixture',
        password: 'other password',
        seeds: {electrum: 'other seed'},
      }, []);
    });

    const account = await createProfile();

    expect(savedBeforeBiometrics).toMatchObject({accountHash, biometry: false});
    expect(storeBiometricPassword).toHaveBeenCalledWith(accountHash, password);
    const users = await storedUsers();
    expect(users.map(user => user.id)).toEqual([profileName, 'Other fixture']);
    expect(users[0]).toMatchObject({accountHash, biometry: true});
    expect(account).toEqual(users[0]);
    expect(initializeAccountData).toHaveBeenCalledWith(users[0], password);
    expect(dispatch).toHaveBeenCalledWith({
      type: BIOMETRIC_AUTH,
      payload: {accountHash, biometry: true, accounts: users},
    });
    expect(store.getState().authentication.accounts).toEqual(users);
    expect(JSON.parse(await SecureStorage.getItem(USER_DATA_STORAGE_INTERNAL_KEY)).futureMetadata)
      .toEqual({version: 2});
  });

  it('keeps password login available with biometrics disabled when credential setup fails', async () => {
    storeBiometricPassword.mockRejectedValue(new Error('Biometric prompt cancelled'));

    const account = await createProfile();

    const users = await storedUsers();
    expect(users).toHaveLength(1);
    expect(account).toEqual(users[0]);
    expect(account.biometry).toBe(false);
    expect(decryptkey(password, account.encryptedKeys.electrum)).toBe(seed);
    expect(initializeAccountData).toHaveBeenCalledWith(account, password);
    expect(dispatch.mock.calls.some(([action]) => action.type === BIOMETRIC_AUTH)).toBe(false);
  });

  it('does not enable biometric metadata when its persistence fails after storing the credential', async () => {
    const write = SecureStorage.setItem.bind(SecureStorage);
    jest.spyOn(SecureStorage, 'setItem').mockImplementation((key, value) => {
      if (key === USER_DATA_STORAGE_INTERNAL_KEY && JSON.parse(value).users.some(user => user.biometry)) {
        return Promise.reject(new Error('Biometric metadata write failed'));
      }
      return write(key, value);
    });

    const account = await createProfile();

    expect(storeBiometricPassword).toHaveBeenCalledTimes(1);
    expect(account.biometry).toBe(false);
    expect((await storedUsers())[0]).toEqual(account);
    expect(decryptkey(password, account.encryptedKeys.electrum)).toBe(seed);
    expect(initializeAccountData).toHaveBeenCalledWith(account, password);
  });

  it('preserves the ordinary password-only creation path', async () => {
    const account = await createProfile({useBiometrics: false});

    expect(storeBiometricPassword).not.toHaveBeenCalled();
    expect(account.biometry).toBe(false);
    expect((await storedUsers())[0]).toEqual(account);
    expect(initializeAccountData).toHaveBeenCalledWith(account, password);
  });
});
