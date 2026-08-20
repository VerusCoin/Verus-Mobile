const mockDispatch = jest.fn();
const mockGetState = jest.fn();
const mockGetActiveCoinList = jest.fn();
const mockStoreCoins = jest.fn();
let mockCoinStorageQueue = Promise.resolve();
const mockQueueCoinStorageMutation = jest.fn(mutation => {
  const result = mockCoinStorageQueue.then(mutation, mutation);
  mockCoinStorageQueue = result.catch(() => {});
  return result;
});

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {dispatch: mockDispatch, getState: mockGetState},
}));

jest.mock('../../../actions/actionCreators', () => ({
  setCoinList: activeCoinList => ({type: 'SET_COIN_LIST', activeCoinList}),
  setCurrentUserCoins: activeCoinsForUser => ({
    type: 'SET_USER_COINS',
    payload: {activeCoinsForUser},
  }),
}));

jest.mock('../../asyncStore/asyncStore', () => ({
  awaitCoinStorageMutations: jest.fn(() => mockCoinStorageQueue),
  getActiveCoinList: mockGetActiveCoinList,
  queueCoinStorageMutation: mockQueueCoinStorageMutation,
  storeCoins: mockStoreCoins,
}));

jest.mock('../../../actions/actions/channels/dlight/dispatchers/LightWalletReduxManager', () => ({
  closeDlightWallet: jest.fn(),
  initDlightWallet: jest.fn(),
}));
jest.mock('../../../actions/actions/channels/eth/dispatchers/EthWalletReduxManager', () => ({
  closeEthWallet: jest.fn(),
  initEthWallet: jest.fn(),
}));
jest.mock('../../../actions/actions/channels/electrum/dispatchers/ElectrumWalletReduxManager', () => ({
  closeElectrumWallet: jest.fn(),
  initElectrumWallet: jest.fn(),
}));
jest.mock('../../../actions/actions/channels/general/dispatchers/GeneralWalletReduxManager', () => ({
  closeGeneralWallet: jest.fn(),
  initGeneralWallet: jest.fn(),
}));
jest.mock('../../../actions/actions/channels/vrpc/dispatchers/VrpcWalletReduxManager', () => ({
  closeVrpcWallet: jest.fn(),
  initVrpcWallet: jest.fn(),
}));
jest.mock('../../../actions/actions/channels/wyre/dispatchers/WyreWalletReduxManager', () => ({
  closeWyreCoinWallet: jest.fn(),
  initWyreCoinChannel: jest.fn(),
}));
jest.mock('../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager', () => ({
  closeVerusIdWallet: jest.fn(),
  initVerusIdWallet: jest.fn(),
}));

jest.mock('../../../actions/actions/intervals/dispatchers/IntervalCreator', () => ({
  captureLifecycleIntervalIds: jest.fn(() => ({
    coinUpdateIntervals: {},
    serviceUpdateIntervals: {},
  })),
  clearAllCoinIntervals: jest.fn(),
  clearAllServiceIntervals: jest.fn(),
}));

jest.mock('../../auth/authBox', () => ({requestSeeds: jest.fn()}));
jest.mock('../../../../env/index', () => ({DISABLED_CHANNELS: []}));

const {addCoin, removeExistingCoin} = require('../../../actions/actions/coins/Coins');
const {
  resolveChannelCloseRequest,
} = require('../../channelCloseRequests');

const deferred = () => {
  let resolve;
  const promise = new Promise(resolvePromise => {
    resolve = resolvePromise;
  });
  return {promise, resolve};
};

describe('serialized immutable coin membership mutations', () => {
  afterEach(() => jest.useRealTimers());

  it('does not lose a concurrent add when remove was called with a stale list', async () => {
    const account = {
      id: 'alice',
      accountHash: 'account-a',
      seeds: {},
    };
    mockGetState.mockReturnValue({
      authentication: {
        activeAccount: account,
        accounts: [account],
        sessionEpoch: 2,
      },
      channelStore_dlight_private: {dlightSockets: {}},
      updates: {coinUpdateIntervals: {}, serviceUpdateIntervals: {}},
    });
    const originalStored = [{
      id: 'BTC',
      compatible_channels: [],
      users: ['alice'],
    }];
    const callerSnapshot = originalStored.map(coin => ({
      ...coin,
      users: [...coin.users],
    }));
    let persisted = originalStored;
    const firstWrite = deferred();
    mockGetActiveCoinList.mockImplementation(async () => persisted);
    mockStoreCoins.mockImplementationOnce(async next => {
      await firstWrite.promise;
      persisted = next;
    });
    mockStoreCoins.mockImplementation(async next => {
      persisted = next;
    });

    const add = addCoin(
      {id: 'VRSC', compatible_channels: []},
      callerSnapshot,
      'alice',
      [],
    );
    const remove = removeExistingCoin(
      'BTC',
      'alice',
      mockDispatch,
      false,
    );

    await Promise.resolve();
    expect(mockGetActiveCoinList).toHaveBeenCalledTimes(1);
    firstWrite.resolve();
    const [addAction, removedList] = await Promise.all([add, remove]);

    expect(addAction.activeCoinList).toEqual([
      expect.objectContaining({id: 'BTC', users: ['alice']}),
      expect.objectContaining({id: 'VRSC', users: ['alice']}),
    ]);
    expect(removedList).toEqual([
      expect.objectContaining({id: 'BTC', users: []}),
      expect.objectContaining({id: 'VRSC', users: ['alice']}),
    ]);
    expect(persisted).toEqual(removedList);
    expect(callerSnapshot).toEqual(originalStored);
  });

  it('accepts a timed-out provider cleanup and releases the mutation queue', async () => {
    jest.useFakeTimers();
    mockDispatch.mockClear();
    const account = {
      id: 'alice',
      accountHash: 'account-a',
      seeds: {},
    };
    mockGetState.mockReturnValue({
      authentication: {
        activeAccount: account,
        accounts: [account],
        sessionEpoch: 2,
      },
      channelStore_dlight_private: {dlightSockets: {}},
      updates: {coinUpdateIntervals: {}, serviceUpdateIntervals: {}},
    });
    let persisted = [{
      id: 'TOKEN',
      compatible_channels: ['erc20'],
      currency_id: '0xAbC',
      network: 'mainnet',
      users: ['alice'],
    }];
    mockGetActiveCoinList.mockImplementation(async () => persisted);
    mockStoreCoins.mockImplementation(async next => {
      persisted = next;
    });

    const removal = removeExistingCoin(
      'TOKEN',
      'alice',
      mockDispatch,
      false,
      {teardownTimeoutMs: 10},
    );
    const addition = addCoin(
      {id: 'VRSC', compatible_channels: []},
      persisted,
      'alice',
      [],
    );

    let closeAction;
    for (let i = 0; i < 10 && closeAction == null; i++) {
      await Promise.resolve();
      closeAction = mockDispatch.mock.calls
        .map(([action]) => action)
        .find(action => action.meta?.channelCloseRequestId != null);
    }
    expect(closeAction).toBeDefined();
    jest.advanceTimersByTime(11);
    await expect(removal).resolves.toEqual([
      expect.objectContaining({id: 'TOKEN', users: []}),
    ]);
    expect(resolveChannelCloseRequest(
      closeAction.meta.channelCloseRequestId,
      {status: 'closed'},
    )).toBe(false);
    await expect(addition).resolves.toMatchObject({
      activeCoinList: [
        expect.objectContaining({id: 'TOKEN', users: []}),
        expect.objectContaining({id: 'VRSC', users: ['alice']}),
      ],
    });
  });
});
