const mockDispatch = jest.fn();
const mockGetState = jest.fn();
const mockInitializeWallet = jest.fn();
const mockOpenWallet = jest.fn();
const mockCloseWallet = jest.fn();
const mockEraseWallet = jest.fn();
const mockGetAddresses = jest.fn();
const mockRequestSeeds = jest.fn();
const mockBlockchainQuitError = jest.fn();
const mockWyreService = {
  deauthenticate: jest.fn(),
};

jest.mock('../../../store/index', () => ({
  __esModule: true,
  default: {
    dispatch: mockDispatch,
    getState: mockGetState,
  },
}));

jest.mock('../../api/channels/dlight/callCreators', () => ({
  closeWallet: mockCloseWallet,
  eraseWallet: mockEraseWallet,
  getAddresses: mockGetAddresses,
  initializeWallet: mockInitializeWallet,
  openWallet: mockOpenWallet,
}));

jest.mock('../../keys', () => ({
  isDlightSpendingKey: jest.fn(() => false),
}));

jest.mock('../../auth/authBox', () => ({
  requestSeeds: mockRequestSeeds,
}));

jest.mock('../../services/WyreService', () => ({
  __esModule: true,
  default: {
    bearerFromSeed: jest.fn(),
    build: jest.fn(() => mockWyreService),
  },
}));

jest.mock(
  '../../../actions/actions/channels/dlight/dispatchers/AlertManager',
  () => ({
    blockchainQuitError: mockBlockchainQuitError,
    canRetryDlightInitialization: jest.fn(async () => false),
  }),
);

const {
  ERROR_DLIGHT_INIT,
  INIT_DLIGHT_CHANNEL_START,
  SET_ADDRESSES,
} = require('../../constants/storeType');
const {DLIGHT_PRIVATE} = require('../../constants/intervalConstants');
const {
  closeDlightWallet,
  initDlightWallet,
} = require('../../../actions/actions/channels/dlight/dispatchers/LightWalletReduxManager');
const {WyreApi} = require('../../services/WyreApi');

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {promise, reject, resolve};
};

const accountState = (accountHash, sessionEpoch) => ({
  authentication: {
    activeAccount: {
      accountHash,
      keys: {
        VRSC: {
          [DLIGHT_PRIVATE]: {},
        },
      },
    },
    sessionEpoch,
  },
  channelStore_dlight_private: {
    dlightSockets: {},
    dlightSyncing: {},
  },
  settings: {},
});

const coinObj = {
  id: 'VRSC',
  proto: 'vrsc',
  dlight_endpoints: ['lightwallet.example:443'],
};

describe('account-scoped wallet initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitializeWallet.mockResolvedValue({result: true});
    mockOpenWallet.mockResolvedValue({result: true});
    mockCloseWallet.mockResolvedValue(undefined);
    mockEraseWallet.mockResolvedValue(true);
    mockBlockchainQuitError.mockResolvedValue(false);
    mockRequestSeeds.mockResolvedValue({
      [DLIGHT_PRIVATE]: 'wallet seed words',
    });
  });

  it('closes an account-A native wallet that finishes opening after switching to account B', async () => {
    const nativeWallet = deferred();
    let state = accountState('account-a', 1);
    mockGetState.mockImplementation(() => state);
    mockInitializeWallet.mockReturnValueOnce(nativeWallet.promise);

    const initialization = initDlightWallet(coinObj);
    await new Promise(resolve => setImmediate(resolve));
    expect(mockInitializeWallet).toHaveBeenCalled();

    state = accountState('account-b', 2);
    nativeWallet.resolve({result: true});
    await initialization;

    expect(
      mockDispatch.mock.calls.some(
        ([action]) => action.type === SET_ADDRESSES,
      ),
    ).toBe(false);
    expect(
      mockDispatch.mock.calls.some(
        ([action]) => action.type === INIT_DLIGHT_CHANNEL_START,
      ),
    ).toBe(false);
    expect(mockCloseWallet).toHaveBeenCalledWith(
      'VRSC',
      'account-a',
      'vrsc',
    );
  });

  it('does not start a native wallet when the account changes while seeds load', async () => {
    const seeds = deferred();
    let state = accountState('account-a', 1);
    mockGetState.mockImplementation(() => state);
    mockRequestSeeds.mockReturnValueOnce(seeds.promise);

    const initialization = initDlightWallet(coinObj);
    state = accountState('account-b', 2);
    seeds.resolve({[DLIGHT_PRIVATE]: 'wallet seed words'});
    await initialization;

    expect(mockInitializeWallet).not.toHaveBeenCalled();
    expect(mockOpenWallet).not.toHaveBeenCalled();
    expect(mockCloseWallet).not.toHaveBeenCalled();
  });

  it('waits for a pre-resolution native init and its final close before teardown finishes', async () => {
    const nativeWallet = deferred();
    const finalClose = deferred();
    const state = accountState('account-a', 6);
    mockGetState.mockReturnValue(state);
    mockInitializeWallet.mockReturnValueOnce(nativeWallet.promise);
    mockCloseWallet.mockReturnValueOnce(finalClose.promise);

    const initialization = initDlightWallet(coinObj);
    await new Promise(resolve => setImmediate(resolve));
    expect(mockInitializeWallet).toHaveBeenCalled();

    // Redux still says the socket is not open. Teardown must nevertheless wait
    // for the tracked native initialization and make its close the final alias
    // operation instead of returning `not_open`.
    const teardown = closeDlightWallet(coinObj, false, {
      dlightSockets: {},
      ownerAccountHash: 'account-a',
      sessionScope: {
        accountHash: 'account-a',
        sessionEpoch: 6,
        sessionScoped: true,
      },
      teardown: true,
    });
    let teardownSettled = false;
    teardown.finally(() => {
      teardownSettled = true;
    });
    await new Promise(resolve => setImmediate(resolve));
    expect(teardownSettled).toBe(false);
    expect(mockCloseWallet).not.toHaveBeenCalled();

    await expect(initDlightWallet(coinObj)).rejects.toMatchObject({
      code: 'DLIGHT_TEARDOWN_PENDING',
    });
    expect(mockInitializeWallet).toHaveBeenCalledTimes(1);

    nativeWallet.resolve({result: true});
    await new Promise(resolve => setImmediate(resolve));
    expect(mockCloseWallet).toHaveBeenCalledWith(
      'VRSC',
      'account-a',
      'vrsc',
    );
    expect(teardownSettled).toBe(false);

    // Even after the old open resolves, a replacement stays blocked until the
    // final native close and stale initializer unwind have both completed.
    await expect(initDlightWallet(coinObj)).rejects.toMatchObject({
      code: 'DLIGHT_TEARDOWN_PENDING',
    });

    finalClose.resolve();
    await expect(teardown).resolves.toMatchObject({status: 'closed'});
    await initialization;

    expect(mockCloseWallet).toHaveBeenCalledTimes(1);
    expect(
      mockDispatch.mock.calls.some(
        ([action]) => action.type === SET_ADDRESSES,
      ),
    ).toBe(false);
    expect(
      mockDispatch.mock.calls.some(
        ([action]) => action.type === INIT_DLIGHT_CHANNEL_START,
      ),
    ).toBe(false);
  });

  it('tags successful address and channel actions with the captured account session', async () => {
    mockGetState.mockReturnValue(accountState('account-a', 7));
    mockGetAddresses.mockResolvedValueOnce({result: 'zs-account-a'});

    await initDlightWallet(coinObj);

    const addressAction = mockDispatch.mock.calls
      .map(([action]) => action)
      .find(action => action.type === SET_ADDRESSES);
    const channelAction = mockDispatch.mock.calls
      .map(([action]) => action)
      .find(action => action.type === INIT_DLIGHT_CHANNEL_START);

    expect(addressAction.meta).toEqual({
      accountHash: 'account-a',
      sessionEpoch: 7,
      sessionScoped: true,
    });
    expect(channelAction.meta).toEqual(addressAction.meta);
  });

  it('preserves erase semantics when a user retries a failed native close', async () => {
    mockGetState.mockReturnValue(accountState('account-a', 8));
    mockEraseWallet
      .mockRejectedValueOnce(new Error('native failure'))
      .mockResolvedValueOnce(true);
    mockBlockchainQuitError.mockResolvedValueOnce(true);

    await expect(closeDlightWallet(coinObj, true, {
      allowRetryPrompt: true,
      dlightSockets: {VRSC: true},
      ownerAccountHash: 'account-a',
      sessionScope: {
        accountHash: 'account-a',
        sessionEpoch: 8,
        sessionScoped: true,
      },
    })).resolves.toEqual(expect.objectContaining({
      status: 'erased',
      clearDb: true,
    }));

    expect(mockEraseWallet).toHaveBeenCalledTimes(2);
    expect(mockCloseWallet).not.toHaveBeenCalled();
  });

  it('blocks init after an uncertain close until a captured-not-open retry succeeds', async () => {
    mockGetState.mockReturnValue(accountState('account-a', 8));
    mockCloseWallet.mockRejectedValueOnce(new Error('native close failed'));

    await expect(closeDlightWallet(coinObj, false, {
      allowRetryPrompt: false,
      dlightSockets: {VRSC: true},
      ownerAccountHash: 'account-a',
      sessionScope: {
        accountHash: 'account-a',
        sessionEpoch: 8,
        sessionScoped: true,
      },
    })).rejects.toMatchObject({code: 'DLIGHT_TEARDOWN_FAILED'});
    expect(
      mockDispatch.mock.calls.some(
        ([action]) => action.type === ERROR_DLIGHT_INIT,
      ),
    ).toBe(false);

    await expect(initDlightWallet(coinObj)).rejects.toMatchObject({
      name: 'DlightInitializationError',
      code: 'DLIGHT_TEARDOWN_RECOVERY_REQUIRED',
    });
    expect(mockInitializeWallet).not.toHaveBeenCalled();
    const blockedInitAction = mockDispatch.mock.calls
      .map(([action]) => action)
      .find(action => action.type === ERROR_DLIGHT_INIT);
    expect(blockedInitAction.payload.error).toMatchObject({
      name: 'DlightInitializationError',
      code: 'DLIGHT_TEARDOWN_RECOVERY_REQUIRED',
      accountHash: 'account-a',
    });
    expect(blockedInitAction.payload.error).not.toHaveProperty('clearDb');

    // The retry's captured Redux snapshot says not-open. The persistent
    // uncertain marker must override that snapshot and force a native close.
    await expect(closeDlightWallet(coinObj, false, {
      allowRetryPrompt: false,
      dlightSockets: {VRSC: false},
      ownerAccountHash: 'account-a',
      sessionScope: {
        accountHash: 'account-a',
        sessionEpoch: 8,
        sessionScoped: true,
      },
    })).resolves.toMatchObject({status: 'closed'});
    expect(mockCloseWallet).toHaveBeenCalledTimes(2);

    mockGetAddresses.mockResolvedValueOnce({result: 'zs-recovered'});
    await expect(initDlightWallet(coinObj)).resolves.toBeUndefined();
    expect(mockInitializeWallet).toHaveBeenCalledTimes(1);
  });

  it('opens and erases a closed on-disk wallet with the captured plaintext seed', async () => {
    mockGetState.mockReturnValue(accountState('account-a', 9));
    const requestContext = {
      dlightSeed: 'captured plaintext seed words',
      dlightSockets: {VRSC: false},
      ownerAccountHash: 'account-a',
      sessionScope: {
        accountHash: 'account-a',
        sessionEpoch: 9,
        sessionScoped: true,
      },
    };

    await closeDlightWallet(coinObj, true, requestContext);

    expect(mockOpenWallet).toHaveBeenCalledWith(
      'VRSC',
      'vrsc',
      'account-a',
      'lightwallet.example',
      443,
      'captured plaintext seed words',
      '',
    );
    expect(mockEraseWallet).toHaveBeenCalledWith(
      'VRSC',
      'account-a',
      'vrsc',
    );
    expect(requestContext).not.toHaveProperty('dlightSeed');
    expect(JSON.stringify(requestContext)).not.toContain(
      'captured plaintext seed words',
    );
  });

  it('redacts native initialization errors before logging or Redux publication', async () => {
    mockGetState.mockReturnValue(accountState('account-a', 9));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const nativeError = Object.assign(
      new Error('native failure for wallet seed words'),
      {code: 'NATIVE_INIT_FAILED', seed: 'wallet seed words'},
    );
    mockInitializeWallet.mockRejectedValueOnce(nativeError);

    try {
      await initDlightWallet(coinObj);

      const publishedErrors = mockDispatch.mock.calls
        .map(([action]) => action)
        .filter(action => action.type === ERROR_DLIGHT_INIT)
        .map(action => action.payload.error);
      expect(publishedErrors.length).toBeGreaterThan(0);
      expect(
        publishedErrors.some(
          error => error.nativeCode === 'NATIVE_INIT_FAILED',
        ),
      ).toBe(true);
      for (const error of publishedErrors) {
        expect(error).not.toBe(nativeError);
        expect(error.message).not.toContain('wallet seed words');
        expect(error).not.toHaveProperty('seed');
        expect(error).not.toHaveProperty('cause');
      }
      expect(
        warnSpy.mock.calls.flat().map(String).join(' '),
      ).not.toContain('wallet seed words');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('falls back to seed-open before erase when a pending native init rejects', async () => {
    const nativeInitialization = deferred();
    mockGetState.mockReturnValue(accountState('account-a', 9));
    mockInitializeWallet.mockReturnValueOnce(nativeInitialization.promise);

    const initialization = initDlightWallet(coinObj);
    await new Promise(resolve => setImmediate(resolve));
    const teardown = closeDlightWallet(coinObj, true, {
      dlightSeed: 'captured plaintext seed words',
      dlightSockets: {VRSC: false},
      ownerAccountHash: 'account-a',
      sessionScope: {
        accountHash: 'account-a',
        sessionEpoch: 9,
        sessionScoped: true,
      },
      teardown: true,
    });

    nativeInitialization.reject(new Error('native init rejected'));
    await expect(teardown).resolves.toMatchObject({status: 'erased'});
    await initialization;

    expect(mockOpenWallet).toHaveBeenCalledWith(
      'VRSC',
      'vrsc',
      'account-a',
      'lightwallet.example',
      443,
      'captured plaintext seed words',
      '',
    );
    expect(mockEraseWallet).toHaveBeenCalledWith(
      'VRSC',
      'account-a',
      'vrsc',
    );
  });

  it('times out visibly and blocks same-owner init until the native close settles', async () => {
    jest.useFakeTimers();
    const nativeErase = deferred();
    mockGetState.mockReturnValue(accountState('account-a', 10));
    mockEraseWallet.mockReturnValueOnce(nativeErase.promise);

    const closing = closeDlightWallet(coinObj, true, {
      dlightSockets: {VRSC: true},
      ownerAccountHash: 'account-a',
      sessionScope: {
        accountHash: 'account-a',
        sessionEpoch: 10,
        sessionScoped: true,
      },
      teardownTimeoutMs: 10,
    });
    const timedOut = expect(closing).rejects.toMatchObject({
      code: 'DLIGHT_TEARDOWN_TIMEOUT',
      clearDb: true,
    });
    jest.advanceTimersByTime(11);
    await timedOut;

    await expect(initDlightWallet(coinObj)).rejects.toMatchObject({
      code: 'DLIGHT_TEARDOWN_PENDING',
    });
    expect(mockInitializeWallet).not.toHaveBeenCalled();

    nativeErase.resolve(true);
    await Promise.resolve();
    await Promise.resolve();
    jest.useRealTimers();
  });

  it('does not target a native database when the closed profile has no DLight seed', async () => {
    const state = accountState('account-without-dlight', 11);
    state.authentication.activeAccount.keys = {};
    mockGetState.mockReturnValue(state);

    await expect(closeDlightWallet(coinObj, true, {
      dlightSockets: {VRSC: false},
      hasDlightSeed: false,
      ownerAccountHash: 'account-without-dlight',
      sessionScope: {
        accountHash: 'account-without-dlight',
        sessionEpoch: 11,
        sessionScoped: true,
      },
      teardown: true,
    })).resolves.toMatchObject({
      status: 'not_owned',
      accountHash: 'account-without-dlight',
      clearDb: true,
    });

    expect(mockOpenWallet).not.toHaveBeenCalled();
    expect(mockEraseWallet).not.toHaveBeenCalled();
    expect(mockCloseWallet).not.toHaveBeenCalled();
  });

  it('treats a captured empty socket map as authoritative after switching accounts', async () => {
    const state = accountState('account-b', 12);
    state.channelStore_dlight_private.dlightSockets.VRSC = true;
    mockGetState.mockReturnValue(state);

    await expect(closeDlightWallet(coinObj, false, {
      dlightSockets: {},
      ownerAccountHash: 'account-a',
      sessionScope: {
        accountHash: 'account-a',
        sessionEpoch: 11,
        sessionScoped: true,
      },
      teardown: true,
    })).resolves.toMatchObject({status: 'not_open'});

    expect(mockCloseWallet).not.toHaveBeenCalled();
    expect(mockEraseWallet).not.toHaveBeenCalled();
  });
});

describe('account-scoped Wyre address loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('drops account-A deposit addresses that finish after switching to account B', async () => {
    const account = deferred();
    let state = accountState('account-a', 3);
    mockGetState.mockImplementation(() => state);

    const api = new WyreApi();
    api.accountId = 'wyre-account-a';
    api.getAccount = jest.fn(() => account.promise);

    const loading = api.loadWyreCoinAddresses();
    state = accountState('account-b', 4);
    account.resolve({
      depositAddresses: {BTC: 'btc-account-a', ETH: 'eth-account-a'},
      id: 'wyre-account-a',
    });
    await loading;

    expect(
      mockDispatch.mock.calls.some(
        ([action]) => action.type === SET_ADDRESSES,
      ),
    ).toBe(false);
  });
});
