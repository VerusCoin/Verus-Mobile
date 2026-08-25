const mockGetState = jest.fn();
const mockResetUserPwd = jest.fn();
const mockRequestPassword = jest.fn();
const mockRequestSeeds = jest.fn();
const mockUpdateAccountKeys = jest.fn();

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {getState: mockGetState},
}));

jest.mock('../../../actions/actionCreators', () => ({
  authenticateUser: jest.fn(),
  setAccounts: jest.fn(accounts => ({
    type: 'SET_ACCOUNTS',
    payload: {accounts},
  })),
  updateAccountKeys: mockUpdateAccountKeys,
}));

jest.mock('../../asyncStore/asyncStore', () => ({
  resetUserPwd: mockResetUserPwd,
}));

jest.mock('../../../actions/actions/coins/Coins', () => ({
  removeExistingCoin: jest.fn(),
}));

jest.mock('../../../actions/actions/personal/dispatchers/personal', () => ({
  clearEncryptedPersonalDataForUser: jest.fn(),
}));

jest.mock('../../../actions/actions/services/dispatchers/services', () => ({
  clearEncryptedServiceStoredDataForUser: jest.fn(),
}));

jest.mock('../../../actions/actions/account/dispatchers/account', () => ({
  clearActiveAccountLifecycles: jest.fn(),
}));

jest.mock('../../auth/authBox', () => ({
  initSession: jest.fn(),
  requestPassword: mockRequestPassword,
  requestSeeds: mockRequestSeeds,
}));

jest.mock('../../keys', () => ({deriveKeyPair: jest.fn()}));

const {addKeypairs, resetPwd} = require('../../../actions/actions/UserData');

const accountState = (accountHash, sessionEpoch) => ({
  authentication: {
    activeAccount: {accountHash},
    sessionEpoch,
  },
});

const deferred = () => {
  let resolve;
  const promise = new Promise(promiseResolve => {
    resolve = promiseResolve;
  });
  return {promise, resolve};
};

describe('password reset session scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestPassword.mockResolvedValue('password-a');
    mockRequestSeeds.mockResolvedValue({electrum: 'seed-a'});
  });

  it('uses the pre-reset scope internally and the incremented epoch for SET_ACCOUNTS', async () => {
    let state = accountState('account-a', 8);
    mockGetState.mockImplementation(() => state);
    mockResetUserPwd.mockImplementation(async (_hash, _newPwd, _oldPwd, scope) => {
      expect(scope).toEqual({
        accountHash: 'account-a',
        sessionEpoch: 8,
        sessionScoped: true,
      });
      state = accountState('account-a', 9);
      return [{accountHash: 'account-a'}];
    });

    const action = await resetPwd('account-a', 'new-password', 'old-password');

    expect(action).toMatchObject({
      type: 'BIOMETRIC_AUTH',
      payload: {
        biometry: false,
        accountHash: 'account-a',
        accounts: [{accountHash: 'account-a'}],
      },
    });
    expect(action.meta).toEqual({
      accountHash: 'account-a',
      sessionEpoch: 9,
      sessionScoped: true,
    });
  });

  it('does not return an account mutation after another account takes over', async () => {
    const migration = deferred();
    let state = accountState('account-a', 2);
    mockGetState.mockImplementation(() => state);
    mockResetUserPwd.mockReturnValueOnce(migration.promise);

    const resetting = resetPwd('account-a', 'new-password', 'old-password');
    state = accountState('account-b', 3);
    migration.resolve([{accountHash: 'account-a'}]);

    await expect(resetting).rejects.toThrow(
      'Account changed while the password reset was in progress',
    );
  });

  it('does not generate account-B keys for an account-A claim callback', async () => {
    const seeds = deferred();
    let state = accountState('account-a', 4);
    mockGetState.mockImplementation(() => state);
    mockRequestSeeds.mockReturnValueOnce(seeds.promise);
    const requestContext = {
      sessionScope: {
        accountHash: 'account-a',
        sessionEpoch: 4,
        sessionScoped: true,
      },
    };

    const adding = addKeypairs(
      {
        id: 'NEW',
        compatible_channels: [],
        tags: [],
        testnet: false,
      },
      {},
      0,
      requestContext,
    );
    await new Promise(resolve => setImmediate(resolve));
    expect(mockRequestSeeds).toHaveBeenCalled();

    state = accountState('account-b', 5);
    seeds.resolve({electrum: 'seed-b'});

    await expect(adding).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(mockUpdateAccountKeys).not.toHaveBeenCalled();
  });
});
