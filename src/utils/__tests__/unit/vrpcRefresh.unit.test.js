const mockGetEndpoint = jest.fn();

jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {getEndpoint: (...args) => mockGetEndpoint(...args)},
}));

jest.mock('../../api/channels/vrpc/callCreators', () => ({
  getAddressBalances: jest.fn(),
  getAddressDeltas: jest.fn(),
  getAddressMempool: jest.fn(),
  getInfo: jest.fn(),
}));

jest.mock('../../math', () => ({
  satsToCoins: satoshis => satoshis.dividedBy(100000000),
}));

jest.mock('../../standardization/standardizeTxObj', () => ({
  standardizeVrpcTxObj: (transaction, coinObj, height) => ({...transaction, height}),
}));

const {createVrpcRefresh} = require('../../vrpc/vrpcRefresh');
const {
  updateVrpcBalances,
  updateVrpcTransactions,
} = require('../../../actions/actions/wallet/dispatchers/vrpc/updates');
const {
  getAddressBalances,
  getAddressDeltas,
  getAddressMempool,
  getInfo,
} = require('../../api/channels/vrpc/callCreators');
const {
  API_GET_BALANCES,
  API_GET_TRANSACTIONS,
} = require('../../constants/intervalConstants');

const nativeCoin = {id: 'NATIVE', currency_id: 'system'};
const tokenCoin = {id: 'TOKEN', currency_id: 'token'};
const firstChannel = 'vrpc.first.system';
const secondChannel = 'vrpc.second.system';
const job = (updateId, channels = [firstChannel], coinObj = nativeCoin) => ({
  coinObj,
  channels,
  updateId,
});
const deferred = () => {
  let resolve;
  const promise = new Promise(settle => { resolve = settle; });
  return {promise, resolve};
};
const responseFor = request => {
  const address = request.addresses?.addresses[0];

  switch (request.cmd) {
    case 'getaddressbalance':
      return {result: {balance: 200000000, currencybalance: {token: '12.5'}}};
    case 'getaddressdeltas':
      return {result: [
        {txid: 'confirmed', address, satoshis: 500000000, currencyvalues: {token: '9'}},
        {txid: 'confirmed', address, satoshis: -300000000, currencyvalues: {token: '-2'}},
        {txid: 'other-currency', address, satoshis: 0, currencyvalues: {other: '10'}},
      ]};
    case 'getaddressmempool':
      return {result: [
        {txid: 'pending', address, satoshis: 100000000, currencyvalues: {token: '3'}},
      ]};
    case 'getinfo':
      return {result: {longestchain: 100}};
    default:
      throw new Error(`Unexpected command ${request.cmd}`);
  }
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetEndpoint.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('planned VRPC refresh reads', () => {
  it('starts one requestMany per system after planning every coin and address', async () => {
    const requestMany = jest.fn(async requests => requests.map(responseFor));
    mockGetEndpoint.mockReturnValue({requestMany});
    const channels = [firstChannel, secondChannel, 'electrum'];
    const refresh = createVrpcRefresh([
      job(API_GET_BALANCES, channels),
      job(API_GET_TRANSACTIONS, channels),
      job(API_GET_BALANCES, channels, tokenCoin),
      job(API_GET_TRANSACTIONS, channels, tokenCoin),
    ]);

    // Consumers can register their normal wallet updates before execution.
    const balance = updateVrpcBalances(nativeCoin, firstChannel, {vrpcRefresh: refresh});
    const transactions = updateVrpcTransactions(tokenCoin, firstChannel, {vrpcRefresh: refresh});

    expect(mockGetEndpoint).not.toHaveBeenCalled();
    expect(requestMany).not.toHaveBeenCalled();
    expect(getAddressBalances).not.toHaveBeenCalled();
    expect(getAddressDeltas).not.toHaveBeenCalled();

    const execution = refresh.execute();
    expect(refresh.execute()).toBe(execution);
    await execution;

    expect(mockGetEndpoint).toHaveBeenCalledTimes(1);
    expect(mockGetEndpoint).toHaveBeenCalledWith('system');
    expect(requestMany).toHaveBeenCalledTimes(1);
    const requests = requestMany.mock.calls[0][0];
    expect(requests.map(request => request.cmd)).toEqual([
      'getaddressbalance', 'getaddressbalance',
      'getaddressdeltas', 'getinfo', 'getaddressmempool',
      'getaddressdeltas', 'getaddressmempool',
    ]);
    expect(requests.filter(request => request.cmd === 'getaddressdeltas')
      .map(request => request.getParams())).toEqual([
      [{addresses: ['first'], friendlynames: true, verbosity: 1}],
      [{addresses: ['second'], friendlynames: true, verbosity: 1}],
    ]);
    expect((await balance).body.total).toBe('2');
    expect((await transactions).body.map(delta => [delta.txid, delta.amount])).toEqual([
      ['pending', '3'], ['confirmed', '7'],
    ]);
  });

  it('shares raw results across currencies without changing per-currency formatting', async () => {
    const requestMany = jest.fn(async requests => requests.map(responseFor));
    mockGetEndpoint.mockReturnValue({requestMany});
    const refresh = createVrpcRefresh([
      job(API_GET_BALANCES), job(API_GET_TRANSACTIONS),
      job(API_GET_BALANCES, [firstChannel], tokenCoin),
      job(API_GET_TRANSACTIONS, [firstChannel], tokenCoin),
    ]);
    await refresh.execute();

    const [nativeBalance, tokenBalance, nativeTxs, tokenTxs] = await Promise.all([
      updateVrpcBalances(nativeCoin, firstChannel, {vrpcRefresh: refresh}),
      updateVrpcBalances(tokenCoin, firstChannel, {vrpcRefresh: refresh}),
      updateVrpcTransactions(nativeCoin, firstChannel, {vrpcRefresh: refresh}),
      updateVrpcTransactions(tokenCoin, firstChannel, {vrpcRefresh: refresh}),
    ]);

    expect(requestMany.mock.calls[0][0]).toHaveLength(4);
    expect(nativeBalance.body.total).toBe('2');
    expect(tokenBalance.body.total).toBe('12.5');
    expect(nativeTxs.body.map(delta => delta.amount)).toEqual(['1', '2']);
    expect(tokenTxs.body.map(delta => delta.amount)).toEqual(['3', '7']);
    expect(tokenTxs.body[0]).toMatchObject({mempool: true, height: 100});
    const [rawDeltas, , rawMempool] = await refresh.getTransactions(firstChannel);
    expect(rawDeltas.result).toHaveLength(3);
    expect(rawMempool.result[0]).not.toHaveProperty('mempool');
  });

  it('starts independent systems concurrently and pins one endpoint for each', async () => {
    const first = deferred();
    const second = deferred();
    const requestManyFirst = jest.fn(() => first.promise);
    const requestManySecond = jest.fn(() => second.promise);
    mockGetEndpoint.mockImplementation(systemId => ({
      requestMany: systemId === 'system' ? requestManyFirst : requestManySecond,
    }));
    const otherChannel = 'vrpc.first.other';
    const refresh = createVrpcRefresh([
      job(API_GET_BALANCES, [firstChannel, otherChannel]),
    ]);
    const executing = refresh.execute();

    expect(requestManyFirst).toHaveBeenCalledTimes(1);
    expect(requestManySecond).toHaveBeenCalledTimes(1);
    first.resolve([{result: {balance: 1}}]);
    second.resolve([{result: {balance: 2}}]);
    await executing;

    expect((await refresh.getBalance(firstChannel)).result.balance).toBe(1);
    expect((await refresh.getBalance(otherChannel)).result.balance).toBe(2);
  });

  it('keeps RPC errors local to the affected request', async () => {
    mockGetEndpoint.mockReturnValue({
      requestMany: async requests => requests.map(request => request.cmd === 'getaddressbalance'
        ? {error: {message: 'Balance unavailable'}}
        : responseFor(request)),
    });
    const refresh = createVrpcRefresh([job(API_GET_BALANCES), job(API_GET_TRANSACTIONS)]);
    await refresh.execute();

    await expect(updateVrpcBalances(nativeCoin, firstChannel, {vrpcRefresh: refresh}))
      .rejects.toThrow('Balance unavailable');
    expect((await updateVrpcTransactions(nativeCoin, firstChannel, {vrpcRefresh: refresh})).body)
      .toHaveLength(2);
  });

  it('settles a failed system without preventing another system from refreshing', async () => {
    const otherChannel = 'vrpc.first.other';
    mockGetEndpoint.mockImplementation(systemId => {
      if (systemId === 'system') throw new Error('No endpoint');
      return {requestMany: async requests => requests.map(responseFor)};
    });
    const refresh = createVrpcRefresh([
      job(API_GET_BALANCES, [firstChannel, otherChannel]),
      job(API_GET_TRANSACTIONS),
    ]);
    await refresh.execute();

    expect((await refresh.getBalance(firstChannel)).error.message).toBe('No endpoint');
    expect((await refresh.getTransactions(firstChannel)).every(response => response.error)).toBe(true);
    expect((await refresh.getBalance(otherChannel)).result.balance).toBe(200000000);
  });

  it('settles all deferred results when transport fails', async () => {
    mockGetEndpoint.mockReturnValue({
      requestMany: async () => { throw new Error('Connection lost'); },
    });
    const refresh = createVrpcRefresh([job(API_GET_BALANCES), job(API_GET_TRANSACTIONS)]);
    await refresh.execute();

    expect((await refresh.getBalance(firstChannel)).error.message).toBe('Connection lost');
    expect((await refresh.getTransactions(firstChannel)).every(response => response.error)).toBe(true);
  });

  it('does not send a plan whose wallet session has ended', async () => {
    const refresh = createVrpcRefresh([
      job(API_GET_BALANCES), job(API_GET_TRANSACTIONS),
    ], {isCurrent: () => false});
    await refresh.execute();

    expect(mockGetEndpoint).not.toHaveBeenCalled();
    expect((await refresh.getBalance(firstChannel)).error.message).toMatch(/session has ended/);
    expect((await refresh.getTransactions(firstChannel)).every(response => response.error)).toBe(true);
  });

  it('does not select an endpoint for an empty or non-VRPC refresh', async () => {
    const refresh = createVrpcRefresh([
      job(API_GET_BALANCES, ['electrum']), job('get_info'),
    ]);
    await refresh.execute();

    expect(mockGetEndpoint).not.toHaveBeenCalled();
  });
});

describe('standalone VRPC transaction reads', () => {
  it('nets interleaved mempool rows while preserving transaction order and separate confirmed rows', async () => {
    getAddressDeltas.mockResolvedValue({result: [
      {txid: 'shared', satoshis: 100000000, detail: 'confirmed'},
    ]});
    getInfo.mockResolvedValue({result: {longestchain: 100}});
    getAddressMempool.mockResolvedValue({result: [
      {txid: 'change', satoshis: -500000000, detail: 'first'},
      {txid: 'shared', satoshis: 200000000, detail: 'pending'},
      {txid: 'change', satoshis: 300000000, detail: 'last'},
    ]});

    const {body} = await updateVrpcTransactions(nativeCoin, firstChannel);

    expect(body.map(({txid, amount, detail, mempool}) => ({txid, amount, detail, mempool})))
      .toEqual([
        {txid: 'change', amount: '-2', detail: 'last', mempool: true},
        {txid: 'shared', amount: '2', detail: 'pending', mempool: true},
        {txid: 'shared', amount: '1', detail: 'confirmed', mempool: undefined},
      ]);
  });

  it('starts all reads before deltas finish and tolerates a failed mempool request', async () => {
    const deltas = deferred();
    getAddressDeltas.mockReturnValue(deltas.promise);
    getInfo.mockResolvedValue({result: {longestchain: 100}});
    getAddressMempool.mockRejectedValue(new Error('Mempool unavailable'));

    const update = updateVrpcTransactions(nativeCoin, firstChannel);
    await Promise.resolve();

    expect(getAddressDeltas).toHaveBeenCalledWith('system', ['first'], true, 1);
    expect(getInfo).toHaveBeenCalledWith('system');
    expect(getAddressMempool).toHaveBeenCalledWith('system', ['first'], true, 1);

    deltas.resolve({result: [{txid: 'confirmed', satoshis: 100000000}]});
    expect((await update).body).toEqual([
      {txid: 'confirmed', satoshis: 100000000, amount: '1', height: 100},
    ]);
  });

  it('keeps confirmed history when selecting a mempool endpoint fails synchronously', async () => {
    getAddressDeltas.mockResolvedValue({result: [{txid: 'confirmed', satoshis: 100000000}]});
    getInfo.mockResolvedValue({result: {longestchain: 100}});
    getAddressMempool.mockImplementation(() => { throw new Error('No mempool endpoint'); });

    expect((await updateVrpcTransactions(nativeCoin, firstChannel)).body).toHaveLength(1);
  });
});
