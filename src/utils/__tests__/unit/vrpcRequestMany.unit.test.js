const mockHttpPost = jest.fn();
const mockCachedResponses = new Map();
const mockGetCachedResponse = jest.fn();
const mockSetCachedResponse = jest.fn();
const mockCacheKey = (chain, endpoint, req) => JSON.stringify([chain, endpoint, req.prepare()]);

// Use the actual SDK and request primitives. Mock only HTTP and device services
// so a malformed merged getParams() reaches the same serializer as production.
jest.mock('axios', () => ({create: () => ({post: (...args) => mockHttpPost(...args)})}));
jest.mock('verusid-ts-client', () => ({VerusIdInterface: class {}}));
jest.mock('react-native', () => ({
  Alert: {alert: jest.fn()},
  AppState: {currentState: 'active', addEventListener: jest.fn()},
}));
jest.mock('../../../store', () => ({
  __esModule: true,
  default: {dispatch: jest.fn(), getState: () => ({channelStore_vrpc: {vrpcEndpoints: {}}})},
}));
jest.mock('../../asyncStore/asyncStore', () => ({
  getCachedVrpcResponse: (...args) => mockGetCachedResponse(...args),
  getVrpcResponseCacheKey: (...args) => mockCacheKey(...args),
  setCachedVrpcResponse: (...args) => mockSetCachedResponse(...args),
}));
jest.mock('../../CoinData/CoinsList', () => ({coinsList: {VRSC: {}, VRSCTEST: {}}}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {getVrpcEndpoints: () => []}}));
jest.mock('../../../../env/index', () => ({VRPC_API_APP_ID: undefined, VRPC_API_KEYS: {}}));

const {
  GetAddressBalanceRequest,
  GetAddressDeltasRequest,
  GetAddressMempoolRequest,
  GetInfoRequest,
  ApiRequest,
} = require('verus-typescript-primitives');

const chain = 'system';
const server = 'https://refresh.example.com';
const balance = address => new GetAddressBalanceRequest(chain, {addresses: [address]});
const deltas = (addresses, options = {}) => new GetAddressDeltasRequest(chain, {addresses, ...options});
const mempool = (addresses, options = {}) => new GetAddressMempoolRequest(chain, {addresses, ...options});
const deferred = () => {
  let resolve;
  const promise = new Promise(complete => { resolve = complete; });
  return {promise, resolve};
};

const responseFor = body => {
  if (body.method === 'getinfo') return {result: {blocks: 123}, error: null};
  if (body.method === 'getaddressbalance') return {result: {balance: 100}, error: null};

  const options = body.params[0];
  const rows = options.addresses.map((address, index) => ({address, txid: `${address}-tx`, timestamp: index}));
  return {
    result: options.chaininfo
      ? {deltas: rows, start: {height: options.start}, end: {height: options.end}}
      : rows,
    error: null,
  };
};
const httpResponse = body => ({status: 200, data: Array.isArray(body) ? body.map(responseFor) : responseFor(body)});
const bodies = () => mockHttpPost.mock.calls.map(call => call[1]);
const commands = () => bodies().flat();

describe('explicit cached VRPC refresh batches', () => {
  let vrpc;
  let rpc;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    jest.clearAllMocks();
    mockCachedResponses.clear();
    mockGetCachedResponse.mockReset().mockImplementation((...args) =>
      Promise.resolve(mockCachedResponses.get(mockCacheKey(...args))),
    );
    mockSetCachedResponse.mockReset().mockImplementation((system, endpoint, req, res) => {
      mockCachedResponses.set(mockCacheKey(system, endpoint, req), res);
      return Promise.resolve();
    });
    mockHttpPost.mockReset().mockImplementation((url, body) => Promise.resolve(httpResponse(body)));
    vrpc = require('../../vrpc/vrpcInterface').default;
    vrpc.saveChainEndpoint(chain, server);
    rpc = vrpc.cacheInterfaces[vrpc.systemEndpointIds[chain][0]];
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('immediately sends ten wallets as ten balances, one deltas, one mempool, and one info request', async () => {
    const requests = [];
    for (let index = 0; index < 10; index++) {
      requests.push(balance(`A${index}`), deltas([`A${index}`]), mempool([`A${index}`]));
    }
    requests.push(new GetInfoRequest(chain));

    const now = Date.now();
    const results = await rpc.requestMany(requests);

    expect(Date.now()).toBe(now);
    expect(bodies()).toHaveLength(1);
    expect(commands()).toHaveLength(13);
    expect(commands().filter(body => body.method === 'getaddressbalance')).toHaveLength(10);
    expect(commands().find(body => body.method === 'getaddressdeltas').params)
      .toEqual([{addresses: Array.from({length: 10}, (_, index) => `A${index}`)}]);
    expect(commands().find(body => body.method === 'getaddressmempool').params[0].addresses).toHaveLength(10);
    requests.forEach((req, index) => {
      if (req.cmd === 'getaddressdeltas' || req.cmd === 'getaddressmempool') {
        expect(results[index].result.map(row => row.address)).toEqual(req.addresses.addresses);
      }
      expect(mockSetCachedResponse).toHaveBeenCalledWith(chain, server, req, results[index]);
    });
    expect(results[30].result.blocks).toBe(123);
  });

  it('excludes cache hits, deduplicates misses, and leaves cached freshness unchanged', async () => {
    const cached = deltas(['cached']);
    const cachedResponse = {result: [{address: 'cached', txid: 'old'}]};
    const cachedAt = Date.now() - 1000;
    const cacheKey = mockCacheKey(chain, server, cached);
    mockCachedResponses.set(cacheKey, cachedResponse);
    vrpc.setLastNetworkResponseTime(cacheKey, cachedAt);
    const first = deltas(['first']);
    const second = deltas(['second']);

    const results = await rpc.requestMany([cached, first, second, deltas(['first'])]);

    expect(results[0]).toBe(cachedResponse);
    expect(results[1]).toBe(results[3]);
    expect(commands()[0].params).toEqual([{addresses: ['first', 'second']}]);
    expect(commands()).toHaveLength(1);
    expect(mockSetCachedResponse).toHaveBeenCalledTimes(2);
    expect(vrpc.getLastNetworkResponseTime(cacheKey)).toBe(cachedAt);
  });

  it('shares reads with overlapping refreshes and single callers through the cache write', async () => {
    const network = deferred();
    const cacheWrite = deferred();
    mockHttpPost.mockReturnValueOnce(network.promise);
    mockSetCachedResponse.mockReturnValue(cacheWrite.promise);
    const request = deltas(['shared']);
    const first = rpc.requestMany([request, balance('balance')]);
    await jest.advanceTimersByTimeAsync(0);
    const second = rpc.requestMany([deltas(['shared'])]);
    const single = rpc.request(deltas(['shared']));
    expect(bodies()).toHaveLength(1);

    network.resolve(httpResponse(bodies()[0]));
    await jest.advanceTimersByTimeAsync(0);
    const duringWrite = rpc.requestMany([deltas(['shared'])]);
    cacheWrite.resolve();

    const [firstResults, secondResults, singleResult, writeResults] =
      await Promise.all([first, second, single, duringWrite]);
    expect(secondResults[0]).toBe(firstResults[0]);
    expect(singleResult).toBe(firstResults[0]);
    expect(writeResults[0]).toBe(firstResults[0]);
    expect(bodies()).toHaveLength(1);
    expect(mockSetCachedResponse).toHaveBeenCalledTimes(2);
  });

  it('flushes an existing single-read collection window without waiting for its timer', async () => {
    const request = balance('already-waiting');
    const single = rpc.request(request);
    await jest.advanceTimersByTimeAsync(0);
    expect(bodies()).toHaveLength(0);

    const many = await rpc.requestMany([request, deltas(['new'])]);

    expect(await single).toBe(many[0]);
    expect(bodies()).toHaveLength(1);
    expect(commands().map(body => body.method)).toEqual(['getaddressbalance', 'getaddressdeltas']);
  });

  it('merges only identical options and preserves chaininfo wrappers and overlapping address order', async () => {
    const first = deltas(['A', 'B'], {start: 10, end: 20, chaininfo: true, friendlynames: true});
    const second = deltas(['B', 'A'], {friendlynames: true, chaininfo: true, end: 20, start: 10});
    const differentHeight = deltas(['C'], {start: 11, end: 20, chaininfo: true, friendlynames: true});
    const differentVerbosity = deltas(['A'], {start: 10, end: 20, chaininfo: true, friendlynames: true, verbosity: 1});
    const differentMempool = mempool(['A'], {friendlynames: false});
    const moreMempool = mempool(['B'], {friendlynames: true});

    const results = await rpc.requestMany([
      first, second, differentHeight, differentVerbosity, differentMempool, moreMempool,
    ]);

    expect(commands()).toHaveLength(5);
    expect(results[0].result).toEqual({
      deltas: [{address: 'A', txid: 'A-tx', timestamp: 0}, {address: 'B', txid: 'B-tx', timestamp: 1}],
      start: {height: 10}, end: {height: 20},
    });
    expect(results[1].result.deltas.map(row => row.address)).toEqual(['B', 'A']);
    expect(results[2].result.start.height).toBe(11);
    expect(commands()[2].params[0].verbosity).toBe(1);
  });

  it('limits merged queries to 100 addresses and reassembles an individual large query', async () => {
    const addresses = Array.from({length: 205}, (_, index) => `A${index}`);
    const results = await rpc.requestMany([deltas(addresses), mempool(addresses)]);

    expect(commands().map(body => body.params[0].addresses.length)).toEqual([100, 100, 5, 100, 100, 5]);
    expect(results[0].result.map(row => row.address)).toEqual(addresses);
    expect(results[1].result).toHaveLength(205);
    expect(results[1].result.map(row => row.timestamp)).toEqual(
      results[1].result.map(row => row.timestamp).sort((a, b) => a - b),
    );
  });

  it('partitions large histories once instead of scanning every row for every wallet', async () => {
    let addressReads = 0;
    const rows = Array.from({length: 500}, (_, index) => ({
      txid: `transaction-${index}`,
      get address() {
        addressReads++;
        return `A${Math.floor(index / 50)}`;
      },
    }));
    mockHttpPost.mockResolvedValueOnce({status: 200, data: {result: rows, error: null}});

    const results = await rpc.requestMany(Array.from({length: 10}, (_, index) => deltas([`A${index}`])));

    expect(addressReads).toBe(500);
    results.forEach((result, index) => {
      expect(result.result).toHaveLength(50);
      expect(result.result[0].txid).toBe(`transaction-${index * 50}`);
    });
  });

  it('preserves repeated addresses and mempool ordering when splitting overlapping queries', async () => {
    const rows = [
      {address: 'A', txid: 'A-early', timestamp: 1},
      {address: 'B', txid: 'B-early', timestamp: 1},
      {address: 'A', txid: 'A-late', timestamp: 2},
    ];
    mockHttpPost.mockImplementationOnce((url, body) => Promise.resolve({
      status: 200,
      data: body.map(item => ({
        result: rows.filter(row => item.params[0].addresses.includes(row.address)),
        error: null,
      })),
    }));

    const results = await rpc.requestMany([
      mempool(['A', 'A']), mempool(['B', 'A']), deltas(['A', 'A']),
    ]);

    expect(commands().map(body => body.params[0].addresses)).toEqual([['A', 'B'], ['A']]);
    expect(results[0].result.map(row => row.txid)).toEqual(['A-early', 'A-early', 'A-late', 'A-late']);
    expect(results[1].result.map(row => row.txid)).toEqual(['A-early', 'B-early', 'A-late']);
    expect(results[2].result.map(row => row.txid)).toEqual(['A-early', 'A-late', 'A-early', 'A-late']);
  });

  it('serializes envelopes of at most 20 commands', async () => {
    const firstNetwork = deferred();
    mockHttpPost.mockReturnValueOnce(firstNetwork.promise);
    const pending = rpc.requestMany(Array.from({length: 45}, (_, index) => balance(`A${index}`)));
    await jest.advanceTimersByTimeAsync(0);
    expect(bodies().map(body => body.length)).toEqual([20]);

    firstNetwork.resolve(httpResponse(bodies()[0]));
    const results = await pending;

    expect(bodies().map(body => body.length)).toEqual([20, 20, 5]);
    expect(results).toHaveLength(45);
  });

  it('keeps successful siblings when an individual merged RPC or transport request fails', async () => {
    const error = {code: -32602, message: 'Mempool unavailable'};
    mockHttpPost.mockImplementationOnce((url, body) => Promise.resolve({
      status: 200,
      data: body.map(item => item.method === 'getaddressmempool' ? {result: null, error} : responseFor(item)),
    }));
    const results = await rpc.requestMany([balance('A'), deltas(['A']), mempool(['A']), mempool(['B'])]);

    expect(results[0].result.balance).toBe(100);
    expect(results[1].result[0].address).toBe('A');
    expect(results[2].error).toEqual(error);
    expect(results[3].error).toEqual(error);
    expect(mockSetCachedResponse).toHaveBeenCalledTimes(2);

    mockHttpPost.mockRejectedValueOnce(new Error('timeout'));
    const failed = await rpc.requestMany([balance('new-A'), balance('new-B')]);
    expect(failed.map(result => result.error.message)).toEqual(['timeout', 'timeout']);
    expect(bodies()).toHaveLength(2);
  });

  it('contains malformed list rows to that group without discarding successful siblings', async () => {
    mockHttpPost.mockImplementationOnce((url, body) => Promise.resolve({
      status: 200,
      data: body.map(item => item.method === 'getaddressdeltas'
        ? {result: [null], error: null}
        : responseFor(item)),
    }));

    const results = await rpc.requestMany([balance('A'), deltas(['A']), deltas(['B']), mempool(['A'])]);

    expect(results[0].result.balance).toBe(100);
    expect(results[1].error.message).toBe('Invalid VRPC address-list response');
    expect(results[2].error.message).toBe('Invalid VRPC address-list response');
    expect(results[3].result[0].address).toBe('A');
    expect(mockSetCachedResponse).toHaveBeenCalledTimes(2);
  });

  it('continues later envelopes after a transport timeout and caches only successful entries', async () => {
    mockHttpPost.mockRejectedValueOnce(new Error('timeout'));

    const results = await rpc.requestMany(Array.from({length: 25}, (_, index) => balance(`A${index}`)));

    expect(results.slice(0, 20).every(result => result.error.message === 'timeout')).toBe(true);
    expect(results.slice(20).every(result => result.result.balance === 100)).toBe(true);
    expect(bodies().map(body => body.length)).toEqual([20, 5]);
    expect(mockSetCachedResponse).toHaveBeenCalledTimes(5);
  });

  it('retries unsupported envelopes singly, keeps address consolidation, and shares capability state', async () => {
    mockHttpPost.mockResolvedValueOnce({status: 200, data: {error: {code: -32600, message: 'Batch disabled'}}});
    const requests = [balance('A'), deltas(['A']), deltas(['B']), mempool(['A']), mempool(['B'])];
    const results = await rpc.requestMany(requests);

    expect(Array.isArray(bodies()[0])).toBe(true);
    expect(bodies().slice(1).map(body => body.method)).toEqual(['getaddressbalance', 'getaddressdeltas', 'getaddressmempool']);
    expect(bodies()[2].params[0].addresses).toEqual(['A', 'B']);
    expect(results.every(result => result.error == null)).toBe(true);

    await rpc.requestMany([balance('C'), balance('D')]);
    expect(bodies().slice(-2).every(body => !Array.isArray(body))).toBe(true);
    await jest.advanceTimersByTimeAsync(5 * 60 * 1000);
    await rpc.requestMany([balance('E'), balance('F')]);
    expect(Array.isArray(bodies()[bodies().length - 1])).toBe(true);
  });

  it('delegates request arrays but refuses unsupported methods without executing them', async () => {
    const write = new ApiRequest(chain, 'sendrawtransaction');
    write.getParams = () => ['deadbeef'];
    const unknown = new ApiRequest(chain, 'unknown');
    unknown.getParams = () => [];

    const results = await rpc.request([balance('A'), write, unknown]);

    expect(results.map(result => result.error?.code)).toEqual([undefined, -32601, -32601]);
    expect(commands().map(body => body.method)).toEqual(['getaddressbalance']);
    expect(await rpc.requestMany([])).toEqual([]);
  });
});
