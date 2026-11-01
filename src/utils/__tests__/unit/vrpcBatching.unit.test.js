const mockRpcRequest = jest.fn();
const mockCachedResponses = new Map();
const mockGetCachedResponse = jest.fn();
const mockSetCachedResponse = jest.fn();
const mockAppStateListeners = new Set();
const mockAppState = {
  currentState: 'active',
  addEventListener: jest.fn((event, callback) => {
    mockAppStateListeners.add(callback);
    return {remove: () => mockAppStateListeners.delete(callback)};
  }),
};

const mockCacheKey = (chain, endpoint, req) =>
  JSON.stringify([chain, endpoint, req]);

jest.mock('verusd-rpc-ts-client', () => ({
  VerusdRpcInterface: class VerusdRpcInterface {
    constructor(chain) {
      this.chain = chain;
    }

    request(request) {
      return mockRpcRequest(request);
    }
  },
}));

jest.mock('verusid-ts-client', () => ({VerusIdInterface: class {}}));
jest.mock('verus-typescript-primitives', () => ({
  ApiRequest: class {},
  GetBlockHashRequest: class {},
}));
jest.mock('react-native', () => ({
  Alert: {alert: jest.fn()},
  AppState: mockAppState,
}));
jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    dispatch: jest.fn(),
    getState: () => ({channelStore_vrpc: {vrpcEndpoints: {}}}),
  },
}));
jest.mock('../../asyncStore/asyncStore', () => ({
  getCachedVrpcResponse: (...args) => mockGetCachedResponse(...args),
  getVrpcResponseCacheKey: (...args) => mockCacheKey(...args),
  setCachedVrpcResponse: (...args) => mockSetCachedResponse(...args),
}));
jest.mock('../../CoinData/CoinsList', () => ({
  coinsList: {
    VRSC: {system_id: 'vrsc-system'},
    VRSCTEST: {system_id: 'vrsctest-system'},
  },
}));
jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: {getVrpcEndpoints: () => []},
}));
jest.mock('../../../../env/index', () => ({
  VRPC_API_APP_ID: undefined,
  VRPC_API_KEYS: {},
}));

const balance = address => ({cmd: 'getaddressbalance', addresses: [address]});
const deltas = address => ({cmd: 'getaddressdeltas', addresses: [address]});
const responseFor = request => ({result: request.addresses || request.cmd});
const advance = milliseconds => jest.advanceTimersByTimeAsync(milliseconds);
const deferred = () => {
  let resolve;
  const promise = new Promise(complete => {
    resolve = complete;
  });
  return {promise, resolve};
};

describe('VRPC address request batching', () => {
  let vrpc;
  const server = 'https://batch.example.com';

  const connect = (endpoint = server, chain = 'system') => {
    vrpc.saveChainEndpoint(chain, endpoint);
    const ids = vrpc.systemEndpointIds[chain];
    return vrpc.cacheInterfaces[ids[ids.length - 1]];
  };

  const requestPair = (rpc, prefix) =>
    Promise.all([
      rpc.request(balance(`${prefix}-balance`)),
      rpc.request(deltas(`${prefix}-deltas`)),
    ]);

  const changeAppState = state => {
    mockAppState.currentState = state;
    mockAppStateListeners.forEach(listener => listener(state));
  };

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    jest.clearAllMocks();
    mockCachedResponses.clear();
    mockAppStateListeners.clear();
    mockAppState.currentState = 'active';
    mockGetCachedResponse.mockReset().mockImplementation((...args) =>
      Promise.resolve(mockCachedResponses.get(mockCacheKey(...args))),
    );
    mockSetCachedResponse.mockReset().mockImplementation(
      (chain, endpoint, req, res) => {
        mockCachedResponses.set(mockCacheKey(chain, endpoint, req), res);
        return Promise.resolve();
      },
    );
    mockRpcRequest.mockReset().mockImplementation(req =>
      Promise.resolve(Array.isArray(req) ? req.map(responseFor) : responseFor(req)),
    );
    vrpc = require('../../vrpc/vrpcInterface').default;
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('collects mixed address requests for 500ms and caches each original response', async () => {
    const rpc = connect();
    const firstRequest = balance('identity-one');
    const secondRequest = deltas('identity-two');
    const first = rpc.request(firstRequest);

    await advance(200);
    const second = rpc.request(secondRequest);
    await advance(299);
    expect(mockRpcRequest).not.toHaveBeenCalled();

    await advance(1);
    expect(mockRpcRequest).toHaveBeenCalledTimes(1);
    expect(mockRpcRequest).toHaveBeenCalledWith([firstRequest, secondRequest]);
    expect(await Promise.all([first, second])).toEqual([
      responseFor(firstRequest),
      responseFor(secondRequest),
    ]);
    for (const req of [firstRequest, secondRequest]) {
      expect(mockSetCachedResponse).toHaveBeenCalledWith(
        'system', server, req, responseFor(req),
      );
      expect(vrpc.getLastNetworkResponseTime(mockCacheKey('system', server, req)))
        .toBe(Date.now());
    }
  });

  it('keeps cache hits out of a batch and preserves their original freshness timestamp', async () => {
    const rpc = connect();
    const cachedRequest = balance('cached-identity');
    const cachedResponse = {result: {balance: 123}};
    const cacheKey = mockCacheKey('system', server, cachedRequest);
    const cachedAt = Date.now() - 1000;
    mockCachedResponses.set(cacheKey, cachedResponse);
    vrpc.setLastNetworkResponseTime(cacheKey, cachedAt);

    const hit = rpc.request(cachedRequest);
    const misses = requestPair(rpc, 'uncached');
    await advance(500);

    expect(await hit).toBe(cachedResponse);
    await misses;
    expect(mockRpcRequest).toHaveBeenCalledTimes(1);
    expect(mockRpcRequest).toHaveBeenCalledWith([
      balance('uncached-balance'), deltas('uncached-deltas'),
    ]);
    expect(vrpc.getLastNetworkResponseTime(cacheKey)).toBe(cachedAt);
    expect(mockSetCachedResponse).toHaveBeenCalledTimes(2);
  });

  it('sends a lone address request as a single object', async () => {
    const rpc = connect();
    const req = balance('only-identity');
    const result = rpc.request(req);
    await advance(500);

    expect(await result).toEqual(responseFor(req));
    expect(mockRpcRequest).toHaveBeenCalledTimes(1);
    expect(mockRpcRequest).toHaveBeenCalledWith(req);
  });

  it('leaves other methods outside the address batching window', async () => {
    const rpc = connect();
    const addressRequests = requestPair(rpc, 'identity');
    const ordinaryRequest = {cmd: 'getinfo'};
    const ordinary = rpc.request(ordinaryRequest);
    await advance(0);

    expect(await ordinary).toEqual(responseFor(ordinaryRequest));
    expect(mockRpcRequest.mock.calls).toEqual([[ordinaryRequest]]);
    await advance(500);
    await addressRequests;
    expect(mockRpcRequest).toHaveBeenCalledTimes(2);
  });

  it('coalesces duplicates during collection, the network request, and cache writes', async () => {
    const rpc = connect();
    const network = deferred();
    const cacheWrite = deferred();
    mockRpcRequest.mockReturnValueOnce(network.promise);
    mockSetCachedResponse.mockReturnValue(cacheWrite.promise);
    const req = balance('shared-identity');
    const results = [rpc.request(req), rpc.request({...req})];
    const another = rpc.request(deltas('another-identity'));
    await advance(500);
    results.push(rpc.request({...req}));
    await advance(500);
    expect(mockRpcRequest).toHaveBeenCalledTimes(1);

    network.resolve([responseFor(req), responseFor(deltas('another-identity'))]);
    await advance(0);
    results.push(rpc.request({...req}));
    await advance(500);
    expect(mockRpcRequest).toHaveBeenCalledTimes(1);
    cacheWrite.resolve();
    await advance(0);

    expect(await Promise.all(results)).toEqual(results.map(() => responseFor(req)));
    await another;
    expect(mockSetCachedResponse).toHaveBeenCalledTimes(2);
  });

  it('sends at most 20 entries in each batch and waits before starting the next chunk', async () => {
    const rpc = connect();
    const firstNetwork = deferred();
    mockRpcRequest.mockReturnValueOnce(firstNetwork.promise);
    const requests = Array.from({length: 45}, (_, index) => balance(`identity-${index}`));
    const result = Promise.all(requests.map(req => rpc.request(req)));
    await advance(500);

    expect(mockRpcRequest.mock.calls).toEqual([[requests.slice(0, 20)]]);
    firstNetwork.resolve(requests.slice(0, 20).map(responseFor));
    await advance(0);
    expect(await result).toEqual(requests.map(responseFor));
    expect(mockRpcRequest.mock.calls).toEqual([
      [requests.slice(0, 20)],
      [requests.slice(20, 40)],
      [requests.slice(40)],
    ]);
  });

  it('does not cache individual RPC errors or disable batching for them', async () => {
    const rpc = connect();
    const error = {error: {code: -32602, message: 'Invalid address'}};
    mockRpcRequest.mockResolvedValueOnce([error, {result: 'success'}]);
    const first = requestPair(rpc, 'first');
    await advance(500);

    expect(await first).toEqual([error, {result: 'success'}]);
    expect(mockSetCachedResponse).toHaveBeenCalledTimes(1);
    expect(mockSetCachedResponse).toHaveBeenCalledWith(
      'system', server, deltas('first-deltas'), {result: 'success'},
    );
    expect(vrpc.getLastNetworkResponseTime(
      mockCacheKey('system', server, balance('first-balance')),
    )).toBe(0);

    const next = requestPair(rpc, 'next');
    await advance(500);
    await next;
    expect(Array.isArray(mockRpcRequest.mock.calls[1][0])).toBe(true);
  });

  it('replays a rejected batch sequentially and sends later chunks singly', async () => {
    const rpc = connect();
    const firstSingle = deferred();
    mockRpcRequest
      .mockResolvedValueOnce({error: {code: -32600, message: 'Batch requests are disabled'}})
      .mockReturnValueOnce(firstSingle.promise);
    const requests = Array.from({length: 25}, (_, index) => balance(`identity-${index}`));
    const result = Promise.all(requests.map(req => rpc.request(req)));
    await advance(500);

    expect(mockRpcRequest.mock.calls).toEqual([
      [requests.slice(0, 20)],
      [requests[0]],
    ]);
    await advance(500);
    expect(mockRpcRequest).toHaveBeenCalledTimes(2);

    firstSingle.resolve(responseFor(requests[0]));
    await advance(0);
    expect(await result).toEqual(requests.map(responseFor));
    expect(mockRpcRequest.mock.calls).toEqual([
      [requests.slice(0, 20)],
      ...requests.map(req => [req]),
    ]);
    expect(mockSetCachedResponse).toHaveBeenCalledTimes(25);
  });

  it.each([
    [-32602, 'Invalid params'],
    [-32600, 'Batch requests are disabled'],
    [-32603, 'Network request failed'],
  ])('retries a fast whole-batch rejection (%s) singly and remembers the server', async (code, message) => {
    const rpc = connect();
    mockRpcRequest.mockResolvedValueOnce({error: {code, message}});
    const first = requestPair(rpc, 'first');
    await advance(500);

    expect(await first).toEqual([
      responseFor(balance('first-balance')), responseFor(deltas('first-deltas')),
    ]);
    expect(mockRpcRequest.mock.calls).toEqual([
      [[balance('first-balance'), deltas('first-deltas')]],
      [balance('first-balance')],
      [deltas('first-deltas')],
    ]);

    const next = requestPair(rpc, 'next');
    await advance(500);
    await next;
    expect(mockRpcRequest.mock.calls.slice(3)).toEqual([
      [balance('next-balance')], [deltas('next-deltas')],
    ]);
  });

  it('remembers rejection across endpoint recreation and chains without disabling a different server', async () => {
    const rpc = connect();
    mockRpcRequest.mockResolvedValueOnce({error: {code: -32600, message: 'Batch requests are disabled'}});
    const first = requestPair(rpc, 'first');
    await advance(500);
    await first;

    vrpc.deleteAllEndpoints();
    mockRpcRequest.mockClear();
    const recreated = requestPair(connect(), 'recreated');
    const otherChain = requestPair(connect(server, 'other-system'), 'other-chain');
    const otherServer = requestPair(connect('https://other.example.com'), 'other-server');
    await advance(500);
    await Promise.all([recreated, otherChain, otherServer]);

    const batches = mockRpcRequest.mock.calls.map(([req]) => req).filter(Array.isArray);
    expect(batches).toEqual([[balance('other-server-balance'), deltas('other-server-deltas')]]);
    expect(mockRpcRequest).toHaveBeenCalledTimes(5);
  });

  it('retries batching after five minutes of foreground time, excluding time in the background', async () => {
    const rpc = connect();
    mockRpcRequest.mockResolvedValueOnce({error: {code: -32600, message: 'Batch requests are disabled'}});
    const first = requestPair(rpc, 'first');
    await advance(500);
    await first;

    await advance(2 * 60 * 1000);
    changeAppState('background');
    await advance(10 * 60 * 1000);
    changeAppState('active');
    mockRpcRequest.mockClear();
    const beforeExpiry = requestPair(rpc, 'before-expiry');
    await advance(500);
    await beforeExpiry;
    expect(mockRpcRequest.mock.calls.map(([req]) => Array.isArray(req))).toEqual([false, false]);

    await advance(3 * 60 * 1000);
    mockRpcRequest.mockClear();
    const afterExpiry = requestPair(rpc, 'after-expiry');
    await advance(500);
    await afterExpiry;
    expect(mockRpcRequest.mock.calls).toEqual([
      [[balance('after-expiry-balance'), deltas('after-expiry-deltas')]],
    ]);
  });

  it.each([
    'Request failed with status code 429',
    'Request failed with status code 503',
    'timeout of 30000ms exceeded',
  ])('does not disable batching after "%s"', async message => {
    const rpc = connect();
    mockRpcRequest.mockResolvedValueOnce({error: {code: -32603, message}});
    const first = requestPair(rpc, 'first').catch(error => error);
    await advance(500);
    await first;

    mockRpcRequest.mockClear();
    const next = requestPair(rpc, 'next');
    await advance(500);
    await next;
    expect(mockRpcRequest.mock.calls).toEqual([
      [[balance('next-balance'), deltas('next-deltas')]],
    ]);
  });

  it('falls back after an immediately rejected transport promise', async () => {
    const rpc = connect();
    mockRpcRequest.mockRejectedValueOnce(new Error('Network request failed'));
    const first = requestPair(rpc, 'first');
    await advance(500);

    expect(await first).toEqual([
      responseFor(balance('first-balance')), responseFor(deltas('first-deltas')),
    ]);
    expect(mockRpcRequest).toHaveBeenCalledTimes(3);
    expect(mockSetCachedResponse).toHaveBeenCalledTimes(2);
  });

  it('retries malformed batch responses singly instead of assigning results to the wrong callers', async () => {
    const rpc = connect();
    mockRpcRequest.mockResolvedValueOnce([{result: 'missing-second-response'}]);
    const first = requestPair(rpc, 'first');
    await advance(500);

    expect(await first).toEqual([
      responseFor(balance('first-balance')), responseFor(deltas('first-deltas')),
    ]);
    expect(mockRpcRequest).toHaveBeenCalledTimes(3);
    expect(mockSetCachedResponse).toHaveBeenCalledTimes(2);
  });

  it('does not disable batching after a slow transport failure', async () => {
    const rpc = connect();
    const network = deferred();
    mockRpcRequest.mockReturnValueOnce(network.promise);
    const first = requestPair(rpc, 'first').catch(error => error);
    await advance(30000);
    network.resolve({error: {code: -32603, message: 'Network request failed'}});
    await advance(0);
    await first;

    mockRpcRequest.mockClear();
    const next = requestPair(rpc, 'next');
    await advance(500);
    await next;
    expect(mockRpcRequest.mock.calls).toEqual([
      [[balance('next-balance'), deltas('next-deltas')]],
    ]);
  });
});
