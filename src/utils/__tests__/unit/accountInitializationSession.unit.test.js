const mockDispatch = jest.fn();
const mockGetState = jest.fn();
const mockValidateLogin = jest.fn();
const mockInitSession = jest.fn();
const mockRemoveSessionCredential = jest.fn();
const mockResetServices = jest.fn();
const mockCaptureLifecycleTimers = jest.fn();
const mockClearChainLifecycle = jest.fn();
const mockClearServiceIntervals = jest.fn();
const mockCoinManagerMap = {initializers: {}, closers: {}};
const mockFetchActiveCoins = jest.fn();
const mockSetUserCoins = jest.fn();
let state;

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    dispatch: mockDispatch,
    getState: mockGetState,
  },
}));

jest.mock('../../../actions/actionCreators', () => ({
  signIntoAuthenticatedAccount: jest.fn(() => ({type: 'SIGN_IN_USER'})),
  signOut: jest.fn(sessionScope => ({
    type: 'SIGN_OUT',
    ...(sessionScope ? {meta: sessionScope} : {}),
  })),
}));

jest.mock('../../auth/authBox', () => ({
  initSession: mockInitSession,
}));

jest.mock('../../keychain/keychain', () => ({
  removeSessionCredential: mockRemoveSessionCredential,
}));

jest.mock('../../../actions/actions/coins/Coins', () => ({
  COIN_MANAGER_MAP: mockCoinManagerMap,
  fetchActiveCoins: mockFetchActiveCoins,
  setUserCoins: mockSetUserCoins,
}));

jest.mock(
  '../../../actions/actions/intervals/dispatchers/lifecycleManager',
  () => ({
    activateChainLifecycle: jest.fn(),
    activateServiceLifecycle: jest.fn(),
    captureLifecycleTimers: mockCaptureLifecycleTimers,
    clearChainLifecycle: mockClearChainLifecycle,
    clearServiceIntervals: mockClearServiceIntervals,
  }),
);

jest.mock('../../../actions/actions/personal/dispatchers/personal', () => ({
  initPersonalDataForUser: jest.fn(async () => ({})),
}));

jest.mock('../../../actions/actions/services/creators/services', () => ({
  setServiceStored: jest.fn(data => ({
    type: 'SET_SERVICE_STORED_DATA',
    payload: {data},
  })),
}));

jest.mock('../../../actions/actions/services/dispatchers/services', () => ({
  resetServices: mockResetServices,
}));

jest.mock('../../../actions/actions/UserData', () => ({
  fetchUsers: jest.fn(async () => ({type: 'SET_ACCOUNTS'})),
  validateLogin: mockValidateLogin,
}));

jest.mock('../../../actions/actions/WalletSettings', () => ({
  initSettings: jest.fn(async () => ({type: 'SET_ALL_SETTINGS'})),
  saveGeneralSettings: jest.fn(async () => ({type: 'SET_GENERAL_SETTINGS'})),
}));

jest.mock('../../../../env/index', () => ({DISABLED_CHANNELS: []}));

jest.mock(
  '../../api/channels/general/addressBlocklist/getAddressBlocklist',
  () => ({getAddressBlocklistFromServer: jest.fn(async () => [])}),
);

jest.mock('../../asyncStore/serviceStoredDataStorage', () => ({
  loadServiceStoredDataForUser: jest.fn(async () => ({})),
}));

const {
  awaitPendingAccountTeardowns,
  captureAccountTeardownContext,
  clearActiveAccountLifecycles,
  initializeAccountData,
} = require('../../../actions/actions/account/dispatchers/account');
const {DLIGHT_PRIVATE} = require('../../constants/intervalConstants');
const {
  clearDlightTeardownSeed,
  getDlightTeardownSeed,
} = require('../../dlightTeardownSeed');

const deferred = () => {
  let resolve;
  const promise = new Promise(promiseResolve => {
    resolve = promiseResolve;
  });
  return {promise, resolve};
};

describe('account initialization session isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitSession.mockImplementation(async password => `session:${password}`);
    mockRemoveSessionCredential.mockResolvedValue(undefined);
    mockResetServices.mockResolvedValue(undefined);
    mockCaptureLifecycleTimers.mockReturnValue({
      coinUpdateIntervals: {},
      serviceUpdateIntervals: {},
    });
    Object.keys(mockCoinManagerMap.closers).forEach(
      channel => delete mockCoinManagerMap.closers[channel],
    );
    Object.keys(mockCoinManagerMap.initializers).forEach(
      channel => delete mockCoinManagerMap.initializers[channel],
    );
    mockFetchActiveCoins.mockResolvedValue({
      type: 'SET_COIN_LIST',
      activeCoinList: [],
    });
    mockSetUserCoins.mockReturnValue({
      type: 'SET_USER_COINS',
      payload: {activeCoinsForUser: []},
    });

    state = {
      authentication: {
        activeAccount: null,
        sessionEpoch: 0,
      },
      settings: {
        generalWalletSettings: {},
      },
      coins: {
        activeCoinList: [],
        activeCoinsForUser: [],
      },
      channelStore_dlight_private: {
        dlightSockets: {},
      },
    };

    mockGetState.mockImplementation(() => state);
    mockDispatch.mockImplementation(action => {
      if (action.type === 'AUTHENTICATE_USER') {
        state = {
          ...state,
          authentication: {
            activeAccount: action.activeAccount,
            sessionEpoch: state.authentication.sessionEpoch + 1,
          },
        };
      }
      return action;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not let an older account load authenticate after a newer load completes', async () => {
    const accountAValidation = deferred();
    const accountBValidation = deferred();
    const accountA = {id: 'alice', accountHash: 'account-a'};
    const accountB = {id: 'bob', accountHash: 'account-b'};

    mockValidateLogin.mockImplementation(account =>
      account.accountHash === accountA.accountHash
        ? accountAValidation.promise
        : accountBValidation.promise,
    );

    const loadingA = initializeAccountData(accountA, 'password-a');
    const loadingB = initializeAccountData(accountB, 'password-b');

    accountBValidation.resolve({
      type: 'AUTHENTICATE_USER',
      activeAccount: accountB,
      sessionKey: 'session-b',
    });
    await loadingB;

    accountAValidation.resolve({
      type: 'AUTHENTICATE_USER',
      activeAccount: accountA,
      sessionKey: 'session-a',
    });

    await expect(loadingA).rejects.toThrow(
      'A newer account session replaced this account load',
    );

    const authenticationActions = mockDispatch.mock.calls
      .map(([action]) => action)
      .filter(action => action.type === 'AUTHENTICATE_USER');
    expect(authenticationActions).toEqual([
      expect.objectContaining({activeAccount: accountB}),
    ]);
  });

  it('serializes credential writes so an older load cannot overwrite a newer login', async () => {
    const accountASession = deferred();
    const accountA = {id: 'alice', accountHash: 'account-a'};
    const accountB = {id: 'bob', accountHash: 'account-b'};

    mockValidateLogin.mockImplementation(async account => ({
      type: 'AUTHENTICATE_USER',
      activeAccount: account,
      sessionKey: null,
    }));
    mockInitSession.mockImplementation(password =>
      password === 'password-a'
        ? accountASession.promise
        : Promise.resolve('session-b'),
    );

    const loadingA = initializeAccountData(accountA, 'password-a');
    await new Promise(resolve => setImmediate(resolve));
    expect(mockInitSession).toHaveBeenCalledWith('password-a');

    const loadingB = initializeAccountData(accountB, 'password-b');
    await new Promise(resolve => setImmediate(resolve));
    expect(mockInitSession).not.toHaveBeenCalledWith('password-b');

    accountASession.resolve('stale-session-a');

    await expect(loadingA).rejects.toThrow(
      'A newer account session replaced this account load',
    );
    await loadingB;
    expect(mockRemoveSessionCredential).toHaveBeenCalledTimes(1);
    expect(
      mockDispatch.mock.calls
        .map(([action]) => action)
        .filter(action => action.type === 'AUTHENTICATE_USER'),
    ).toEqual([expect.objectContaining({activeAccount: accountB})]);
    expect(mockInitSession.mock.calls.map(([password]) => password)).toEqual([
      'password-a',
      'password-b',
    ]);
    expect(
      mockDispatch.mock.calls.some(([action]) => action.type === 'SIGN_OUT'),
    ).toBe(false);
  });

  it('finishes an account-A teardown from its captured resources after B becomes active', async () => {
    const closingA = deferred();
    const closeA = jest.fn(() => closingA.promise);
    mockCoinManagerMap.closers.test_channel = closeA;
    const accountA = {
      id: 'alice',
      accountHash: 'account-a',
      seeds: {},
    };
    const coinA = {
      id: 'VRSC',
      compatible_channels: ['test_channel'],
      users: ['alice'],
    };
    state = {
      ...state,
      authentication: {
        ...state.authentication,
        activeAccount: accountA,
        sessionEpoch: 4,
      },
      coins: {
        activeCoinList: [coinA],
        activeCoinsForUser: [coinA],
      },
      channelStore_dlight_private: {dlightSockets: {VRSC: true}},
    };
    const timersA = {
      coinUpdateIntervals: {VRSC: {balance: {expire_id: 11}}},
      serviceUpdateIntervals: {service: {update_expired_id: 12}},
    };
    mockCaptureLifecycleTimers.mockReturnValueOnce(timersA);

    const teardown = clearActiveAccountLifecycles();
    await new Promise(resolve => setImmediate(resolve));
    expect(closeA).toHaveBeenCalledWith(
      coinA,
      false,
      expect.objectContaining({
        ownerAccountHash: 'account-a',
        ownerAccountId: 'alice',
      }),
    );

    state = {
      ...state,
      authentication: {
        ...state.authentication,
        activeAccount: {id: 'bob', accountHash: 'account-b', seeds: {}},
        sessionEpoch: 5,
      },
      coins: {
        activeCoinList: [{id: 'BTC', users: ['bob']}],
        activeCoinsForUser: [{id: 'BTC', compatible_channels: []}],
      },
      channelStore_dlight_private: {dlightSockets: {BTC: true}},
    };
    closingA.resolve();
    await teardown;

    expect(mockClearChainLifecycle).toHaveBeenCalledWith(
      'VRSC',
      timersA.coinUpdateIntervals.VRSC,
      expect.objectContaining({accountHash: 'account-a', sessionEpoch: 4}),
    );
    expect(mockClearChainLifecycle).not.toHaveBeenCalledWith(
      'BTC',
      expect.anything(),
      expect.anything(),
    );
  });

  it('routes a non-serializable plaintext seed only to DLight closers', async () => {
    const secret = 'plaintext dlight seed words';
    let dlightCloserSeed;
    let genericCloserSeed;
    mockCoinManagerMap.closers[DLIGHT_PRIVATE] = jest.fn(
      async (_coin, _clearDb, context) => {
        dlightCloserSeed = getDlightTeardownSeed(context);
        expect(JSON.stringify(context)).not.toContain(secret);
        clearDlightTeardownSeed(context);
      },
    );
    mockCoinManagerMap.closers.test_channel = jest.fn(
      async (_coin, _clearDb, context) => {
        genericCloserSeed = getDlightTeardownSeed(context);
      },
    );
    const account = {
      id: 'alice',
      accountHash: 'account-a',
      seeds: {[DLIGHT_PRIVATE]: 'encrypted seed'},
    };
    const coin = {
      id: 'VRSC',
      compatible_channels: [DLIGHT_PRIVATE, 'test_channel'],
      users: ['alice'],
    };
    state = {
      ...state,
      authentication: {
        activeAccount: account,
        sessionEpoch: 5,
      },
      coins: {activeCoinList: [coin], activeCoinsForUser: [coin]},
      channelStore_dlight_private: {dlightSockets: {VRSC: false}},
    };

    const teardownOptions = {
      account,
      clearDb: true,
      dlightSeed: secret,
    };
    const teardown = clearActiveAccountLifecycles(teardownOptions);
    expect(teardownOptions).not.toHaveProperty('dlightSeed');
    expect(JSON.stringify(teardownOptions)).not.toContain(secret);
    expect(getDlightTeardownSeed(teardownOptions)).toBeNull();

    await teardown;

    expect(dlightCloserSeed).toBe(secret);
    expect(genericCloserSeed).toBeNull();
    expect(getDlightTeardownSeed(teardownOptions)).toBeNull();
  });

  it('waits for every started initializer, rolls all channels back, and fails closed', async () => {
    const slowInitialization = deferred();
    const fastFailure = new Error('fast channel failed');
    const closeFast = jest.fn(async () => {});
    const closeSlow = jest.fn(async () => {});
    mockCoinManagerMap.initializers.fast_channel = jest.fn(async () => {
      throw fastFailure;
    });
    mockCoinManagerMap.initializers.slow_channel = jest.fn(
      () => slowInitialization.promise,
    );
    mockCoinManagerMap.closers.fast_channel = closeFast;
    mockCoinManagerMap.closers.slow_channel = closeSlow;
    const coin = {
      id: 'VRSC',
      compatible_channels: ['fast_channel', 'slow_channel'],
      users: ['alice'],
    };
    const account = {id: 'alice', accountHash: 'account-a', seeds: {}};
    mockFetchActiveCoins.mockResolvedValue({
      type: 'SET_COIN_LIST',
      activeCoinList: [coin],
    });
    mockSetUserCoins.mockReturnValue({
      type: 'SET_USER_COINS',
      payload: {activeCoinsForUser: [coin]},
    });
    mockValidateLogin.mockResolvedValue({
      type: 'AUTHENTICATE_USER',
      activeAccount: account,
      sessionKey: null,
    });

    let completed = false;
    const loading = initializeAccountData(account, 'password-a');
    loading.catch(() => {
      completed = true;
    });
    await new Promise(resolve => setImmediate(resolve));
    expect(mockCoinManagerMap.initializers.slow_channel).toHaveBeenCalled();
    expect(completed).toBe(false);
    expect(closeFast).not.toHaveBeenCalled();

    slowInitialization.resolve();
    await expect(loading).rejects.toMatchObject({
      code: 'ACCOUNT_CHANNEL_INITIALIZATION_FAILED',
      failures: [fastFailure],
    });
    expect(closeFast).toHaveBeenCalled();
    expect(closeSlow).toHaveBeenCalled();
    expect(mockRemoveSessionCredential).toHaveBeenCalled();
    expect(
      mockDispatch.mock.calls
        .map(([action]) => action)
        .find(action => action.type === 'SIGN_OUT'),
    ).toEqual(expect.objectContaining({
      meta: expect.objectContaining({
        accountHash: 'account-a',
        sessionScoped: true,
      }),
    }));
  });

  it('bounds a hung closer, clears captured timers, and rejects visibly', async () => {
    jest.useFakeTimers();
    mockCoinManagerMap.closers.hung_channel = jest.fn(
      () => new Promise(() => {}),
    );
    const coin = {
      id: 'VRSC',
      compatible_channels: ['hung_channel'],
      users: ['alice'],
    };
    state = {
      ...state,
      authentication: {
        ...state.authentication,
        activeAccount: {id: 'alice', accountHash: 'account-a', seeds: {}},
        sessionEpoch: 6,
      },
      coins: {activeCoinList: [coin], activeCoinsForUser: [coin]},
      channelStore_dlight_private: {dlightSockets: {}},
    };

    const teardown = clearActiveAccountLifecycles();
    const rejected = expect(teardown).rejects.toMatchObject({
      code: 'ACCOUNT_TEARDOWN_FAILED',
      failures: expect.arrayContaining([
        expect.objectContaining({code: 'ACCOUNT_TEARDOWN_TIMEOUT'}),
      ]),
    });
    for (let i = 0; i < 8; i++) await Promise.resolve();
    jest.runOnlyPendingTimers();
    await rejected;
    await expect(awaitPendingAccountTeardowns()).rejects.toMatchObject({
      code: 'ACCOUNT_TEARDOWN_STILL_PENDING',
    });
    expect(mockClearChainLifecycle).toHaveBeenCalledWith(
      'VRSC',
      {},
      expect.objectContaining({accountHash: 'account-a'}),
    );
  });
});
