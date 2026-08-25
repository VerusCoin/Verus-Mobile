const mockDispatch = jest.fn();
const mockGetState = jest.fn();
const mockDeleteContract = jest.fn();
const mockDeleteEndpoint = jest.fn();
const mockWeb3Provider = {
  deleteContract: mockDeleteContract,
  initContract: jest.fn(),
};
const mockGetWeb3ProviderForNetwork = jest.fn(() => mockWeb3Provider);
const mockVrpcProvider = {
  addDefaultEndpoints: jest.fn(),
  deleteAllEndpoints: jest.fn(),
  deleteEndpoint: mockDeleteEndpoint,
  initEndpoint: jest.fn(),
};

jest.mock('../../../store/index', () => ({
  __esModule: true,
  default: {
    dispatch: mockDispatch,
    getState: mockGetState,
  },
}));

jest.mock('../../web3/provider', () => ({
  deleteAllWeb3Contracts: jest.fn(),
  getWeb3ProviderForNetwork: mockGetWeb3ProviderForNetwork,
}));

jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: mockVrpcProvider,
}));

const {runSaga, stdChannel} = jest.requireActual('redux-saga');
const {
  closeErc20Wallet,
  initErc20Wallet,
} = require('../../../actions/actions/channels/erc20/dispatchers/Erc20WalletReduxManager');
const {
  closeVrpcWallet,
} = require('../../../actions/actions/channels/vrpc/dispatchers/VrpcWalletReduxManager');
const {
  closeVerusIdWallet,
} = require('../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager');
const erc20Saga = require('../../../sagas/channels/erc20').default;
const {
  handleErc20ChannelClose,
  handleErc20ChannelInit,
} = require('../../../sagas/channels/erc20');
const {
  handleVrpcChannelClose,
} = require('../../../sagas/channels/vrpc');
const {
  handleVerusidChannelClose,
} = require('../../../sagas/channels/verusid');
const {
  acquireSagaResource,
  awaitSagaResourceSettlements,
  clearSagaResources,
  completeSagaResourceInitialization,
  getSagaResourceOwnerKey,
  getSagaResourceOwnerCount,
} = require('../../../sagas/channels/resourceOwnership');
const {
  channelCloseRequestIsPending,
  resolveChannelCloseRequest,
} = require('../../channelCloseRequests');

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return {promise, reject, resolve};
};

const stateFor = (accountHash = 'account-a', sessionEpoch = 7) => ({
  authentication: {
    activeAccount: {accountHash},
    sessionEpoch,
  },
});

const seedOwnedResource = (resourceKey, action, channel) => {
  const owner = getSagaResourceOwnerKey(action, channel);
  const ownership = acquireSagaResource(resourceKey, owner);
  completeSagaResourceInitialization(resourceKey, ownership.initialization);
};

describe('provider-backed channel close completion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWeb3ProviderForNetwork.mockReset();
    mockGetWeb3ProviderForNetwork.mockImplementation(() => mockWeb3Provider);
    mockGetState.mockReturnValue(stateFor());
  });

  afterEach(() => {
    jest.useRealTimers();
    clearSagaResources('erc20:');
    clearSagaResources('vrpc:');
  });

  const cases = [
    {
      name: 'ERC20',
      channel: 'erc20',
      close: closeErc20Wallet,
      handler: handleErc20ChannelClose,
      coin: {
        id: 'TOKEN',
        currency_id: '0xAbC',
        network: 'mainnet',
      },
      resourceKey: 'erc20:mainnet:0xabc',
      deleteProviderResource: mockDeleteContract,
    },
    {
      name: 'VRPC',
      channel: 'vrpc',
      close: closeVrpcWallet,
      handler: handleVrpcChannelClose,
      coin: {
        id: 'VRSC',
        system_id: 'system-vrpc',
        vrpc_endpoints: ['https://vrpc.example'],
      },
      resourceKey: 'vrpc:system-vrpc:https://vrpc.example',
      deleteProviderResource: mockDeleteEndpoint,
    },
    {
      name: 'VerusID',
      channel: 'verusid',
      close: closeVerusIdWallet,
      handler: handleVerusidChannelClose,
      coin: {
        id: 'VRSCTEST',
        system_id: 'system-verusid',
        vrpc_endpoints: ['https://verusid.example'],
      },
      resourceKey: 'vrpc:system-verusid:https://verusid.example',
      deleteProviderResource: mockDeleteEndpoint,
    },
  ];

  cases.forEach(
    ({name, channel, close, coin, deleteProviderResource, handler, resourceKey}) => {
      it(`${name} close waits for provider cleanup`, async () => {
        let closeAction;
        mockDispatch.mockImplementation(action => {
          closeAction = action;
          return action;
        });
        const nativeDeletion = deferred();
        deleteProviderResource.mockReturnValueOnce(nativeDeletion.promise);

        const closing = close(coin);
        seedOwnedResource(resourceKey, closeAction, channel);
        let closeSettled = false;
        closing.then(
          () => {
            closeSettled = true;
          },
          () => {
            closeSettled = true;
          },
        );

        const sagaTask = runSaga(
          {dispatch: jest.fn(), getState: mockGetState},
          handler,
          closeAction,
        );
        await Promise.resolve();
        expect(deleteProviderResource).toHaveBeenCalledTimes(1);
        expect(closeSettled).toBe(false);

        nativeDeletion.resolve(true);
        await sagaTask.toPromise();
        await expect(closing).resolves.toMatchObject({status: 'closed'});
      });

      it(`${name} close propagates provider cleanup failure`, async () => {
        let closeAction;
        mockDispatch.mockImplementation(action => {
          closeAction = action;
          return action;
        });
        const providerFailure = new Error(`${name} cleanup failed`);
        deleteProviderResource.mockRejectedValueOnce(providerFailure);

        const closing = close(coin);
        const rejected = expect(closing).rejects.toBe(providerFailure);
        seedOwnedResource(resourceKey, closeAction, channel);

        const sagaTask = runSaga(
          {dispatch: jest.fn(), getState: mockGetState},
          handler,
          closeAction,
        );
        await expect(sagaTask.toPromise()).resolves.toBeUndefined();
        await rejected;
      });

      it(`${name} expires its request while started cleanup finishes late`, async () => {
        jest.useFakeTimers();
        let closeAction;
        mockDispatch.mockImplementation(action => {
          closeAction = action;
          return action;
        });
        const providerDeletion = deferred();
        deleteProviderResource.mockReturnValueOnce(providerDeletion.promise);

        const closing = close(coin, false, {teardownTimeoutMs: 10});
        const timedOut = expect(closing).rejects.toMatchObject({
          code: 'CHANNEL_CLOSE_TIMEOUT',
        });
        seedOwnedResource(resourceKey, closeAction, channel);
        const sagaTask = runSaga(
          {dispatch: jest.fn(), getState: mockGetState},
          handler,
          closeAction,
        );
        await Promise.resolve();
        expect(deleteProviderResource).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(11);
        await timedOut;
        expect(resolveChannelCloseRequest(
          closeAction.meta.channelCloseRequestId,
          {status: 'closed'},
        )).toBe(false);

        providerDeletion.resolve(true);
        await sagaTask.toPromise();
      });
    },
  );

  it('does not start provider cleanup after its close request expires', async () => {
    jest.useFakeTimers();
    let closeAction;
    mockDispatch.mockImplementation(action => {
      closeAction = action;
      return action;
    });
    const coin = {
      id: 'EXPIRED',
      currency_id: '0xExpired',
      network: 'mainnet',
    };
    const resourceKey = 'erc20:mainnet:0xexpired';
    const closing = closeErc20Wallet(coin, false, {teardownTimeoutMs: 10});
    const timedOut = expect(closing).rejects.toMatchObject({
      code: 'CHANNEL_CLOSE_TIMEOUT',
    });
    seedOwnedResource(resourceKey, closeAction, 'erc20');

    jest.advanceTimersByTime(11);
    await timedOut;
    expect(channelCloseRequestIsPending(
      closeAction.meta.channelCloseRequestId,
    )).toBe(false);

    await expect(runSaga(
      {dispatch: jest.fn(), getState: mockGetState},
      handleErc20ChannelClose,
      closeAction,
    ).toPromise()).resolves.toBeUndefined();
    expect(mockDeleteContract).not.toHaveBeenCalled();
  });

  it('rejects a same-resource re-add while timed-out cleanup is uncertain', async () => {
    jest.useFakeTimers();
    const coin = {
      id: 'SAME',
      currency_id: '0xSame',
      network: 'mainnet',
    };
    const resourceKey = 'erc20:mainnet:0xsame';
    const providerDeletion = deferred();
    mockDeleteContract.mockReturnValueOnce(providerDeletion.promise);
    let dispatchedAction;
    mockDispatch.mockImplementation(action => {
      dispatchedAction = action;
      return action;
    });

    const closing = closeErc20Wallet(
      coin,
      false,
      {teardownTimeoutMs: 10},
    );
    const timedOut = expect(closing).rejects.toMatchObject({
      code: 'CHANNEL_CLOSE_TIMEOUT',
    });
    const closeAction = dispatchedAction;
    seedOwnedResource(resourceKey, closeAction, 'erc20');
    const closeTask = runSaga(
      {dispatch: jest.fn(), getState: mockGetState},
      handleErc20ChannelClose,
      closeAction,
    );
    await Promise.resolve();
    expect(mockDeleteContract).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(11);
    await timedOut;

    await initErc20Wallet(coin);
    const timedOutInitAction = dispatchedAction;
    await expect(runSaga(
      {dispatch: jest.fn(), getState: mockGetState, onError: jest.fn()},
      handleErc20ChannelInit,
      timedOutInitAction,
    ).toPromise()).rejects.toMatchObject({
      code: 'CHANNEL_CLOSE_TIMEOUT',
    });
    expect(mockWeb3Provider.initContract).not.toHaveBeenCalled();
    expect(getSagaResourceOwnerCount(resourceKey)).toBe(0);
    await expect(awaitSagaResourceSettlements('erc20:')).rejects.toMatchObject({
      code: 'CHANNEL_CLOSE_TIMEOUT',
    });

    providerDeletion.resolve(true);
    await closeTask.toPromise();

    await initErc20Wallet(coin);
    const retryInitAction = dispatchedAction;
    await expect(runSaga(
      {dispatch: jest.fn(), getState: mockGetState},
      handleErc20ChannelInit,
      retryInitAction,
    ).toPromise()).resolves.toBeUndefined();
    expect(mockWeb3Provider.initContract).toHaveBeenCalledTimes(1);
  });

  it('rejects a failed delete, keeps the ERC20 watcher alive, and retries cleanup', async () => {
    const state = stateFor('account-retry', 9);
    mockGetState.mockReturnValue(state);
    const coin = {
      id: 'RETRY',
      currency_id: '0xRetry',
      network: 'mainnet',
    };
    const resourceKey = 'erc20:mainnet:0xretry';
    const ownerAction = {
      meta: {
        accountHash: 'account-retry',
        sessionEpoch: 9,
        sessionScoped: true,
      },
      payload: {
        chainTicker: coin.id,
        contractAddress: coin.currency_id,
        network: coin.network,
      },
    };
    seedOwnedResource(resourceKey, ownerAction, 'erc20');

    const sagaChannel = stdChannel();
    mockDispatch.mockImplementation(action => {
      sagaChannel.put(action);
      return action;
    });
    const sagaTask = runSaga(
      {
        channel: sagaChannel,
        dispatch: jest.fn(),
        getState: mockGetState,
      },
      erc20Saga,
    );
    const providerFailure = new Error('contract cleanup failed');
    mockDeleteContract
      .mockRejectedValueOnce(providerFailure)
      .mockResolvedValueOnce(true);

    await expect(closeErc20Wallet(coin)).rejects.toBe(providerFailure);
    expect(sagaTask.isRunning()).toBe(true);

    await expect(closeErc20Wallet(coin)).resolves.toMatchObject({
      status: 'closed',
    });
    expect(mockDeleteContract).toHaveBeenCalledTimes(2);
    expect(sagaTask.isRunning()).toBe(true);

    sagaTask.cancel();
    await sagaTask.toPromise();
  });

  it('rejects an ERC20 provider lookup failure and retries cleanup without poisoning the deletion', async () => {
    const state = stateFor('account-provider-retry', 11);
    mockGetState.mockReturnValue(state);
    const coin = {
      id: 'LOOKUP',
      currency_id: '0xLookup',
      network: 'mainnet',
    };
    const resourceKey = 'erc20:mainnet:0xlookup';
    const ownerAction = {
      meta: {
        accountHash: 'account-provider-retry',
        sessionEpoch: 11,
        sessionScoped: true,
      },
      payload: {
        chainTicker: coin.id,
        contractAddress: coin.currency_id,
        network: coin.network,
      },
    };
    seedOwnedResource(resourceKey, ownerAction, 'erc20');

    const sagaChannel = stdChannel();
    mockDispatch.mockImplementation(action => {
      sagaChannel.put(action);
      return action;
    });
    const sagaTask = runSaga(
      {
        channel: sagaChannel,
        dispatch: jest.fn(),
        getState: mockGetState,
      },
      erc20Saga,
    );
    const providerFailure = new Error('provider lookup failed during cleanup');
    mockGetWeb3ProviderForNetwork
      .mockImplementationOnce(() => {
        throw providerFailure;
      })
      .mockImplementation(() => mockWeb3Provider);
    mockDeleteContract.mockResolvedValueOnce(true);

    await expect(closeErc20Wallet(coin)).rejects.toBe(providerFailure);
    expect(mockDeleteContract).not.toHaveBeenCalled();
    expect(sagaTask.isRunning()).toBe(true);

    await expect(closeErc20Wallet(coin)).resolves.toMatchObject({
      status: 'closed',
    });
    expect(mockGetWeb3ProviderForNetwork).toHaveBeenCalledTimes(2);
    expect(mockDeleteContract).toHaveBeenCalledTimes(1);
    expect(sagaTask.isRunning()).toBe(true);

    sagaTask.cancel();
    await sagaTask.toPromise();
  });

  it('releases a failed ERC20 initialization lookup so the watcher can retry', async () => {
    const state = stateFor('account-init-provider-retry', 12);
    mockGetState.mockReturnValue(state);
    const coin = {
      id: 'INITLOOKUP',
      currency_id: '0xInitLookup',
      network: 'mainnet',
    };
    const providerFailure = new Error(
      'provider lookup failed during initialization',
    );
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetWeb3ProviderForNetwork
      .mockImplementationOnce(() => {
        throw providerFailure;
      })
      .mockImplementation(() => mockWeb3Provider);

    const sagaChannel = stdChannel();
    mockDispatch.mockImplementation(action => {
      sagaChannel.put(action);
      return action;
    });
    const sagaTask = runSaga(
      {
        channel: sagaChannel,
        dispatch: jest.fn(),
        getState: mockGetState,
      },
      erc20Saga,
    );

    await initErc20Wallet(coin);
    await Promise.resolve();
    expect(warnSpy).toHaveBeenCalledWith(providerFailure);
    expect(mockWeb3Provider.initContract).not.toHaveBeenCalled();
    expect(sagaTask.isRunning()).toBe(true);

    await initErc20Wallet(coin);
    await Promise.resolve();
    expect(mockGetWeb3ProviderForNetwork).toHaveBeenCalledTimes(2);
    expect(mockWeb3Provider.initContract).toHaveBeenCalledTimes(1);
    expect(mockWeb3Provider.initContract).toHaveBeenCalledWith(
      '0xInitLookup',
    );
    expect(sagaTask.isRunning()).toBe(true);

    warnSpy.mockRestore();
    sagaTask.cancel();
    await sagaTask.toPromise();
  });

  it('waits for an in-flight initializer and the cleanup it schedules', async () => {
    const state = stateFor('account-initializing', 10);
    mockGetState.mockReturnValue(state);
    const coin = {
      id: 'PENDING',
      currency_id: '0xPending',
      network: 'mainnet',
    };
    const providerInitialization = deferred();
    const providerDeletion = deferred();
    mockWeb3Provider.initContract.mockReturnValueOnce(
      providerInitialization.promise,
    );
    mockDeleteContract.mockReturnValueOnce(providerDeletion.promise);

    const sagaChannel = stdChannel();
    mockDispatch.mockImplementation(action => {
      sagaChannel.put(action);
      return action;
    });
    const sagaTask = runSaga(
      {
        channel: sagaChannel,
        dispatch: jest.fn(),
        getState: mockGetState,
      },
      erc20Saga,
    );

    await initErc20Wallet(coin);
    expect(mockWeb3Provider.initContract).toHaveBeenCalledWith('0xPending');
    const closing = closeErc20Wallet(coin);
    let closeSettled = false;
    closing.then(
      () => {
        closeSettled = true;
      },
      () => {
        closeSettled = true;
      },
    );
    await Promise.resolve();
    expect(closeSettled).toBe(false);

    providerInitialization.resolve(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(mockDeleteContract).toHaveBeenCalledWith('0xPending');
    expect(closeSettled).toBe(false);

    providerDeletion.resolve(true);
    await expect(closing).resolves.toMatchObject({status: 'closed'});

    sagaTask.cancel();
    await sagaTask.toPromise();
  });
});
