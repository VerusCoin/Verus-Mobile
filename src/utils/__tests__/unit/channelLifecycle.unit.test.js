const mockVrpcProvider = {
  initEndpoint: jest.fn(),
  deleteEndpoint: jest.fn(),
  deleteAllEndpoints: jest.fn(),
  addDefaultEndpoints: jest.fn(),
};
const mockWeb3Provider = {
  initContract: jest.fn(),
  deleteContract: jest.fn(),
};
const mockGetWeb3Provider = jest.fn(() => mockWeb3Provider);

jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: mockVrpcProvider,
}));
jest.mock('../../web3/provider', () => ({
  getWeb3ProviderForNetwork: mockGetWeb3Provider,
  deleteAllWeb3Contracts: jest.fn(),
}));

const {runSaga, stdChannel} = jest.requireActual('redux-saga');
const vrpcSaga = require('../../../sagas/channels/vrpc').default;
const verusidSaga = require('../../../sagas/channels/verusid').default;
const erc20Saga = require('../../../sagas/channels/erc20').default;
const {
  clearSagaResources,
  getSagaResourceOwnerCount,
} = require('../../../sagas/channels/resourceOwnership');
const types = require('../../constants/storeType');

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
};
const flush = () => new Promise(resolve => setImmediate(resolve));
const endpointPayload = {
  chainTicker: 'VRSC',
  systemId: 'shared-system',
  endpointAddress: 'https://shared.example',
};
const endpointKey = 'vrpc:shared-system:https://shared.example';
const contractPayload = {
  chainTicker: 'TOKEN',
  network: 'mainnet',
  contractAddress: '0xAbC',
};
const cases = [
  {
    name: 'VRPC', saga: vrpcSaga, payload: endpointPayload,
    start: types.INIT_VRPC_CHANNEL_START,
    finish: types.INIT_VRPC_CHANNEL_FINISH,
    initialize: mockVrpcProvider.initEndpoint,
    remove: mockVrpcProvider.deleteEndpoint,
  },
  {
    name: 'VerusID', saga: verusidSaga, payload: endpointPayload,
    start: types.INIT_VERUSID_CHANNEL_START,
    finish: types.INIT_VERUSID_CHANNEL_FINISH,
    initialize: mockVrpcProvider.initEndpoint,
    remove: mockVrpcProvider.deleteEndpoint,
  },
  {
    name: 'ERC20', saga: erc20Saga, payload: contractPayload,
    start: types.INIT_ERC20_CHANNEL_START,
    finish: types.INIT_ERC20_CHANNEL_FINISH,
    initialize: mockWeb3Provider.initContract,
    remove: mockWeb3Provider.deleteContract,
  },
];

describe('channel lifecycle behavior', () => {
  let state;
  let tasks;
  let channel;
  let dispatch;
  const meta = {sessionScoped: true, accountHash: 'account-a', sessionEpoch: 7};
  const startSaga = saga => {
    const task = runSaga({channel, dispatch, getState: () => state}, saga);
    tasks.push(task);
    return task;
  };
  const send = (type, payload) => channel.put({type, payload, meta});

  beforeEach(() => {
    jest.resetAllMocks();
    mockGetWeb3Provider.mockReturnValue(mockWeb3Provider);
    state = {authentication: {activeAccount: {accountHash: 'account-a'}, sessionEpoch: 7}};
    tasks = [];
    channel = stdChannel();
    dispatch = jest.fn();
  });

  afterEach(() => {
    tasks.forEach(task => task.cancel());
    channel.close();
    clearSagaResources('vrpc:');
    clearSagaResources('erc20:');
  });

  it('keeps VerusID ownership when VRPC closes during their shared initialization', async () => {
    const initialization = deferred();
    mockVrpcProvider.initEndpoint.mockReturnValue(initialization.promise);
    startSaga(vrpcSaga);
    startSaga(verusidSaga);
    send(types.INIT_VRPC_CHANNEL_START, endpointPayload);
    send(types.INIT_VERUSID_CHANNEL_START, endpointPayload);
    expect(mockVrpcProvider.initEndpoint).toHaveBeenCalledTimes(1);
    expect(getSagaResourceOwnerCount(endpointKey)).toBe(2);

    send(types.CLOSE_VRPC_CHANNEL, endpointPayload);
    await flush();
    expect(getSagaResourceOwnerCount(endpointKey)).toBe(1);
    expect(mockVrpcProvider.deleteEndpoint).not.toHaveBeenCalled();

    initialization.resolve();
    await flush();
    expect(dispatch.mock.calls.map(([action]) => action.type)).toEqual([
      types.SET_WATCHED_VERUSIDS,
      types.SET_PENDING_VERUSIDS,
      types.INIT_VERUSID_CHANNEL_FINISH,
    ]);
    dispatch.mock.calls.forEach(([action]) => {
      expect(action.payload).toBe(endpointPayload);
      expect(action.meta).toBe(meta);
    });

    send(types.CLOSE_VERUSID_CHANNEL, endpointPayload);
    await flush();
    expect(mockVrpcProvider.deleteEndpoint).toHaveBeenCalledTimes(1);
    expect(mockVrpcProvider.deleteEndpoint).toHaveBeenCalledWith(
      endpointPayload.systemId, endpointPayload.endpointAddress,
    );
    expect(getSagaResourceOwnerCount(endpointKey)).toBe(0);
  });

  it('looks up the ERC20 provider for each owner and binds provider calls', async () => {
    startSaga(erc20Saga);
    send(types.INIT_ERC20_CHANNEL_START, contractPayload);
    const secondCoin = {...contractPayload, chainTicker: 'OTHER_TOKEN'};
    send(types.INIT_ERC20_CHANNEL_START, secondCoin);
    await flush();
    expect(mockGetWeb3Provider.mock.calls).toEqual([['mainnet'], ['mainnet']]);
    expect(mockWeb3Provider.initContract).toHaveBeenCalledTimes(1);
    expect(mockWeb3Provider.initContract).toHaveBeenCalledWith('0xAbC');
    expect(mockWeb3Provider.initContract.mock.contexts[0]).toBe(mockWeb3Provider);
    expect(dispatch.mock.calls.map(([action]) => action.type)).toEqual([
      types.INIT_ERC20_CHANNEL_FINISH, types.INIT_ERC20_CHANNEL_FINISH,
    ]);

    send(types.CLOSE_ERC20_CHANNEL, contractPayload);
    expect(mockWeb3Provider.deleteContract).not.toHaveBeenCalled();
    send(types.CLOSE_ERC20_CHANNEL, secondCoin);
    await flush();
    expect(mockWeb3Provider.deleteContract).toHaveBeenCalledTimes(1);
    expect(mockWeb3Provider.deleteContract).toHaveBeenCalledWith('0xAbC');
    expect(mockWeb3Provider.deleteContract.mock.contexts[0]).toBe(mockWeb3Provider);
  });

  it.each(cases)('$name ignores initialization from a stale session', async entry => {
    startSaga(entry.saga);
    state.authentication.sessionEpoch++;
    send(entry.start, entry.payload);
    await flush();
    expect(entry.initialize).not.toHaveBeenCalled();
    expect(mockGetWeb3Provider).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each(cases)('$name releases initialization that completes after an account switch', async entry => {
    const initialization = deferred();
    entry.initialize.mockReturnValue(initialization.promise);
    startSaga(entry.saga);
    send(entry.start, entry.payload);
    state.authentication = {activeAccount: {accountHash: 'account-b'}, sessionEpoch: 8};
    initialization.resolve();
    await flush();
    expect(entry.remove).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('cancelling a shared initialization waiter does not cancel the other channel', async () => {
    const initialization = deferred();
    mockVrpcProvider.initEndpoint.mockReturnValue(initialization.promise);
    startSaga(vrpcSaga);
    const verusidTask = startSaga(verusidSaga);
    send(types.INIT_VRPC_CHANNEL_START, endpointPayload);
    send(types.INIT_VERUSID_CHANNEL_START, endpointPayload);
    verusidTask.cancel();
    initialization.resolve();
    await flush();
    expect(dispatch.mock.calls.map(([action]) => action.type)).toEqual([
      types.SET_WATCHED_VRPC_ADDRESSES, types.INIT_VRPC_CHANNEL_FINISH,
    ]);
    expect(mockVrpcProvider.deleteEndpoint).not.toHaveBeenCalled();
  });
});
