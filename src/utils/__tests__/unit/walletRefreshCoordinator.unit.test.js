const mockRequestMany = jest.fn();
const mockGetEndpoint = jest.fn();
const mockCreateCoinExpireTimeout = jest.fn();

jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {getEndpoint: (...args) => mockGetEndpoint(...args)},
}));

jest.mock('../../../actions/actionDispatchers', () => ({
  createCoinExpireTimeout: (...args) => mockCreateCoinExpireTimeout(...args),
}));

const {
  conditionallyUpdateWallets,
} = require('../../../actions/actions/wallet/dispatchers/WalletUpdates');
const {ledger} = require('../../../reducers/ledger');
const {updates: updatesReducer} = require('../../../reducers/updates');
const {shouldRejectSessionAction} = require('../../../reducers/sessionScope');
const {CoinDirectory} = require('../../CoinData/CoinDirectory');
const Store = require('../../../store').default;
const {
  API_ABORTED,
  API_ERROR,
  API_GET_BALANCES,
  API_GET_TRANSACTIONS,
  API_SUCCESS,
} = require('../../constants/intervalConstants');
const {
  ERROR_BALANCES,
  RENEW_COIN_DATA,
  SET_BALANCES,
  SET_TRANSACTIONS,
} = require('../../constants/storeType');

const account = {id: 'alice', accountHash: 'account-a'};
const nativeCoin = {id: 'NATIVE', currency_id: 'system', seconds_per_block: 60};
const tokenCoin = {id: 'TOKEN', currency_id: 'token', seconds_per_block: 60};
const channels = Array.from({length: 10}, (_, index) => `vrpc.address-${index}.system`);
const requestedUpdates = (coinIds = ['NATIVE']) => coinIds.flatMap(chainTicker => [
  {chainTicker, updateId: API_GET_BALANCES},
  {chainTicker, updateId: API_GET_TRANSACTIONS},
]);
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
        {txid: `confirmed-${address}`, address, satoshis: 500000000, currencyvalues: {token: '9'}, blocktime: 1000},
        {txid: `confirmed-${address}`, address, satoshis: -300000000, currencyvalues: {token: '-2'}, blocktime: 1000},
      ]};
    case 'getaddressmempool':
      return {result: [
        {txid: `pending-${address}`, address, satoshis: 100000000, currencyvalues: {token: '3'}},
      ]};
    case 'getinfo':
      return {result: {longestchain: 100}};
    default:
      throw new Error(`Unexpected request ${request.cmd}`);
  }
};

// Exercise the real request planner, wallet update functions and reducers. Only
// the network and expiry timers are replaced, so dispatch/session behavior stays
// the same as it is for a running wallet.
describe('shared wallet refresh coordinator', () => {
  let state;
  let dispatched;
  let rejected;
  let dispatch;

  const tracker = (coinId, updateId) => state.updates.coinUpdateTracker[coinId][updateId];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEndpoint.mockReturnValue({requestMany: mockRequestMany});
    mockRequestMany.mockImplementation(async requests => requests.map(responseFor));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(CoinDirectory, 'findCoinObj').mockImplementation(coinId =>
      coinId === 'TOKEN' ? tokenCoin : nativeCoin);

    state = {
      authentication: {activeAccount: account, sessionEpoch: 1},
      coins: {activeCoin: nativeCoin, activeSection: {key: 'overview'}, coinMenuFocused: true},
      channelStore_vrpc: {openCoinChannels: {NATIVE: true, TOKEN: true}},
      ledger: ledger(undefined, {type: '@@init'}),
      updates: updatesReducer(undefined, {type: '@@init'}),
    };

    for (const coinId of ['NATIVE', 'TOKEN']) {
      state.updates.coinUpdateTracker[coinId] = {};
      state.updates.coinUpdateIntervals[coinId] = {};

      for (const updateId of [API_GET_BALANCES, API_GET_TRANSACTIONS]) {
        state.updates.coinUpdateTracker[coinId][updateId] = {
          channels: [...channels],
          busy: {},
          needs_update: true,
          coin_bound: false,
          update_locations: null,
        };
        state.updates.coinUpdateIntervals[coinId][updateId] = {
          expire_timeout: 300000,
          expire_id: null,
        };
      }
    }

    dispatched = [];
    rejected = [];
    dispatch = action => {
      dispatched.push(action);

      if (shouldRejectSessionAction(state, action)) {
        rejected.push(action);
        return;
      }

      state = {
        ...state,
        ledger: ledger(state.ledger, action),
        updates: updatesReducer(state.updates, action),
      };
    };
    jest.spyOn(Store, 'getState').mockImplementation(() => state);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('plans ten addresses together and dispatches every balance and transaction result', async () => {
    const results = await conditionallyUpdateWallets(state, dispatch, requestedUpdates());

    expect(results).toEqual([API_SUCCESS, API_SUCCESS]);
    expect(mockGetEndpoint).toHaveBeenCalledTimes(1);
    expect(mockGetEndpoint).toHaveBeenCalledWith('system');
    expect(mockRequestMany).toHaveBeenCalledTimes(1);
    const requests = mockRequestMany.mock.calls[0][0];
    expect(requests.filter(request => request.cmd === 'getaddressbalance')).toHaveLength(10);
    expect(requests.filter(request => request.cmd === 'getaddressdeltas')).toHaveLength(10);
    expect(requests.filter(request => request.cmd === 'getaddressmempool')).toHaveLength(10);
    expect(requests.filter(request => request.cmd === 'getinfo')).toHaveLength(1);
    expect(dispatched.filter(action => action.type === SET_BALANCES)).toHaveLength(10);
    expect(dispatched.filter(action => action.type === SET_TRANSACTIONS)).toHaveLength(10);

    for (const channel of channels) {
      const address = channel.split('.')[1];
      expect(state.ledger.balances[channel].NATIVE.total).toBe('2');
      expect(state.ledger.transactions[channel].NATIVE).toMatchObject([
        {txid: `pending-${address}`, amount: '1', confirmed: false},
        {txid: `confirmed-${address}`, amount: '2', confirmed: true},
      ]);
      expect(tracker('NATIVE', API_GET_BALANCES).busy[channel]).toBe(false);
      expect(tracker('NATIVE', API_GET_TRANSACTIONS).busy[channel]).toBe(false);
    }

    expect(tracker('NATIVE', API_GET_BALANCES).needs_update).toBe(false);
    expect(tracker('NATIVE', API_GET_TRANSACTIONS).needs_update).toBe(false);
    expect(mockCreateCoinExpireTimeout).toHaveBeenCalledTimes(2);
    expect(rejected).toEqual([]);
  });

  it('deduplicates raw reads across currencies but retains their separate ledger values', async () => {
    const requested = requestedUpdates(['NATIVE', 'TOKEN']);
    const results = await conditionallyUpdateWallets(state, dispatch, [...requested, requested[0]]);

    expect(results).toEqual(Array(5).fill(API_SUCCESS));
    expect(mockRequestMany).toHaveBeenCalledTimes(1);
    expect(mockRequestMany.mock.calls[0][0]).toHaveLength(31);
    expect(dispatched.filter(action => action.type === SET_BALANCES)).toHaveLength(20);
    expect(dispatched.filter(action => action.type === SET_TRANSACTIONS)).toHaveLength(20);
    for (const channel of channels) {
      expect(state.ledger.balances[channel].TOKEN.total).toBe('12.5');
      expect(state.ledger.transactions[channel].TOKEN.map(transaction => transaction.amount))
        .toEqual(['3', '7']);
      expect(state.ledger.transactions[channel].NATIVE.map(transaction => transaction.amount))
        .toEqual(['1', '2']);
    }
  });

  it('excludes busy addresses and fresh update types from the plan', async () => {
    tracker('NATIVE', API_GET_BALANCES).busy[channels[0]] = true;
    tracker('NATIVE', API_GET_TRANSACTIONS).needs_update = false;

    const results = await conditionallyUpdateWallets(state, dispatch, requestedUpdates());

    expect(results).toEqual([API_SUCCESS, API_ABORTED]);
    expect(mockRequestMany.mock.calls[0][0]).toHaveLength(9);
    expect(mockRequestMany.mock.calls[0][0].every(request => request.cmd === 'getaddressbalance')).toBe(true);
    expect(state.ledger.balances[channels[0]]).toBeUndefined();
    expect(tracker('NATIVE', API_GET_BALANCES).busy[channels[0]]).toBe(true);
  });

  it('preserves overview and active-coin eligibility', async () => {
    tracker('NATIVE', API_GET_TRANSACTIONS).coin_bound = true;
    tracker('NATIVE', API_GET_TRANSACTIONS).update_locations = ['overview'];
    state.coins.activeSection = {key: 'receive'};

    let results = await conditionallyUpdateWallets(state, dispatch, [requestedUpdates()[1]]);
    expect(results).toEqual([API_ABORTED]);
    expect(mockGetEndpoint).not.toHaveBeenCalled();

    state.coins.activeSection = {key: 'overview'};
    state.coins.activeCoin = tokenCoin;
    results = await conditionallyUpdateWallets(state, dispatch, [requestedUpdates()[1]]);
    expect(results).toEqual([API_ABORTED]);
    expect(mockGetEndpoint).not.toHaveBeenCalled();

    state.coins.activeCoin = nativeCoin;
    results = await conditionallyUpdateWallets(state, dispatch, [requestedUpdates()[1]]);
    expect(results).toEqual([API_SUCCESS]);
    expect(mockRequestMany.mock.calls[0][0].some(request => request.cmd === 'getaddressbalance')).toBe(false);
  });

  it('does not refresh closed channels', async () => {
    state.channelStore_vrpc.openCoinChannels.NATIVE = false;

    expect(await conditionallyUpdateWallets(state, dispatch, requestedUpdates()))
      .toEqual([API_ABORTED, API_ABORTED]);
    expect(mockGetEndpoint).not.toHaveBeenCalled();
    expect(dispatched).toEqual([]);
  });

  it('rejects old-session results without renewing data or scheduling expiry', async () => {
    const pending = deferred();
    mockRequestMany.mockReturnValue(pending.promise);
    const result = conditionallyUpdateWallets(state, dispatch, requestedUpdates());
    const requests = mockRequestMany.mock.calls[0][0];

    state = {
      ...state,
      authentication: {activeAccount: {id: 'bob', accountHash: 'account-b'}, sessionEpoch: 2},
      ledger: ledger(undefined, {type: '@@init'}),
      updates: updatesReducer(undefined, {type: '@@init'}),
    };
    pending.resolve(requests.map(responseFor));

    expect(await result).toEqual([API_ERROR, API_ERROR]);
    expect(dispatched.some(action => action.type === RENEW_COIN_DATA)).toBe(false);
    expect(mockCreateCoinExpireTimeout).not.toHaveBeenCalled();
    expect(rejected.filter(action => [SET_BALANCES, SET_TRANSACTIONS].includes(action.type))).toHaveLength(20);
    for (const channel of channels) {
      expect(state.ledger.balances[channel]).toBeUndefined();
      expect(state.ledger.transactions[channel]).toBeUndefined();
    }
  });

  it('does not execute a refresh for a stale state snapshot', async () => {
    const oldState = state;
    state = {...state, authentication: {...state.authentication, sessionEpoch: 2}};

    expect(await conditionallyUpdateWallets(oldState, dispatch, requestedUpdates()))
      .toEqual([API_ABORTED, API_ABORTED]);
    expect(mockGetEndpoint).not.toHaveBeenCalled();
    expect(dispatched).toEqual([]);
  });

  it('keeps confirmed history when mempool requests fail', async () => {
    mockRequestMany.mockImplementation(async requests => requests.map(request =>
      request.cmd === 'getaddressmempool'
        ? {error: {message: 'Mempool unavailable'}}
        : responseFor(request)));

    expect(await conditionallyUpdateWallets(state, dispatch, requestedUpdates()))
      .toEqual([API_SUCCESS, API_SUCCESS]);
    for (const channel of channels) {
      expect(state.ledger.transactions[channel].NATIVE).toMatchObject([
        {amount: '2', confirmed: true},
      ]);
      expect(state.ledger.transactions[channel].NATIVE).toHaveLength(1);
    }
  });

  it('keeps successful addresses and transaction updates after one balance error', async () => {
    mockRequestMany.mockImplementation(async requests => requests.map(request =>
      request.cmd === 'getaddressbalance' && request.addresses.addresses[0] === 'address-0'
        ? {error: {message: 'Balance unavailable'}}
        : responseFor(request)));

    expect(await conditionallyUpdateWallets(state, dispatch, requestedUpdates()))
      .toEqual([API_ERROR, API_SUCCESS]);
    expect(dispatched.filter(action => action.type === ERROR_BALANCES)).toHaveLength(1);
    expect(dispatched.filter(action => action.type === SET_BALANCES)).toHaveLength(9);
    expect(dispatched.filter(action => action.type === SET_TRANSACTIONS)).toHaveLength(10);
    expect(state.ledger.balances[channels[0]]).toBeUndefined();
    expect(tracker('NATIVE', API_GET_BALANCES).needs_update).toBe(true);
    expect(tracker('NATIVE', API_GET_TRANSACTIONS).needs_update).toBe(false);
    expect(tracker('NATIVE', API_GET_BALANCES).busy[channels[0]]).toBe(false);
  });
});
