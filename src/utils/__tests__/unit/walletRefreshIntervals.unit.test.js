let mockState;
const mockDispatch = jest.fn();
const mockUpdateWallets = jest.fn();

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    getState: () => mockState,
    dispatch: (...args) => mockDispatch(...args),
  },
}));

jest.mock('../../../actions/actions/wallet/dispatchers/WalletUpdates', () => ({
  conditionallyUpdateWallets: (...args) => mockUpdateWallets(...args),
}));

const Store = require('../../../store').default;
const {
  createWalletRefreshInterval,
  clearWalletRefreshInterval,
} = require('../../../actions/actions/intervals/dispatchers/walletRefreshIntervals');
const {captureSessionScope} = require('../../../actions/actions/updates/sessionRequests');
const {
  API_GET_BALANCES,
  API_GET_TRANSACTIONS,
} = require('../../constants/intervalConstants');

const accountState = (accountHash = 'alice', sessionEpoch = 1) => ({
  authentication: {activeAccount: {accountHash}, sessionEpoch},
});

const deferred = () => {
  let resolve;
  const promise = new Promise(finish => {resolve = finish;});
  return {promise, resolve};
};

let handles;

const register = (interval, chainTicker, updateId, onComplete = jest.fn()) => {
  const handle = createWalletRefreshInterval(
    interval,
    chainTicker,
    updateId,
    onComplete,
    captureSessionScope(mockState),
  );

  handles.push(handle);
  return handle;
};

const requestedUpdates = callIndex => mockUpdateWallets.mock.calls[callIndex][2]
  .map(({chainTicker, updateId}) => ({chainTicker, updateId}));

const advance = async milliseconds => {
  jest.advanceTimersByTime(milliseconds);
  await Promise.resolve();
};

beforeEach(() => {
  jest.useFakeTimers();
  mockState = accountState();
  handles = [];
  mockDispatch.mockClear();
  mockUpdateWallets.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  handles.forEach(clearWalletRefreshInterval);
  jest.useRealTimers();
});

test('same-cadence registrations share initial and periodic refreshes across coins and update types', async () => {
  const completed = [jest.fn(), jest.fn(), jest.fn()];
  register(1000, 'VRSC', API_GET_BALANCES, completed[0]);
  register(1000, 'VRSC', API_GET_TRANSACTIONS, completed[1]);
  register(1000, 'VRSCTEST', API_GET_BALANCES, completed[2]);

  // One immediate scheduling boundary and one shared polling clock.
  expect(jest.getTimerCount()).toBe(2);
  expect(mockUpdateWallets).not.toHaveBeenCalled();

  await advance(0);

  const updates = [
    {chainTicker: 'VRSC', updateId: API_GET_BALANCES},
    {chainTicker: 'VRSC', updateId: API_GET_TRANSACTIONS},
    {chainTicker: 'VRSCTEST', updateId: API_GET_BALANCES},
  ];
  expect(mockUpdateWallets).toHaveBeenCalledTimes(1);
  expect(mockUpdateWallets.mock.calls[0].slice(0, 2)).toEqual([mockState, Store.dispatch]);
  expect(requestedUpdates(0)).toEqual(updates);
  completed.forEach((callback, index) => {
    expect(callback).toHaveBeenCalledWith(mockState, Store.dispatch, updates[index].chainTicker);
  });
  expect(jest.getTimerCount()).toBe(1);

  await advance(1000);

  expect(mockUpdateWallets).toHaveBeenCalledTimes(2);
  expect(requestedUpdates(1)).toEqual(updates);
  completed.forEach(callback => expect(callback).toHaveBeenCalledTimes(2));
});

test('unregistering one coin leaves the other registrations on their shared clock', async () => {
  const removedComplete = jest.fn();
  const retainedComplete = jest.fn();
  const removed = register(1000, 'VRSC', API_GET_BALANCES, removedComplete);
  register(1000, 'VRSCTEST', API_GET_BALANCES, retainedComplete);
  await advance(0);

  clearWalletRefreshInterval(removed);
  await advance(1000);

  expect(jest.getTimerCount()).toBe(1);
  expect(requestedUpdates(1)).toEqual([
    {chainTicker: 'VRSCTEST', updateId: API_GET_BALANCES},
  ]);
  expect(removedComplete).toHaveBeenCalledTimes(1);
  expect(retainedComplete).toHaveBeenCalledTimes(2);
});

test('clearing a captured old handle cannot stop a new session registration', async () => {
  const oldHandle = register(1000, 'VRSC', API_GET_BALANCES);
  clearWalletRefreshInterval(oldHandle);

  // Re-login to the same account still creates a different session and handle.
  mockState = accountState('alice', 2);
  const completed = jest.fn();
  const currentHandle = register(1000, 'VRSC', API_GET_BALANCES, completed);
  expect(currentHandle).not.toBe(oldHandle);

  clearWalletRefreshInterval(oldHandle);
  await advance(0);
  await advance(1000);

  expect(mockUpdateWallets).toHaveBeenCalledTimes(2);
  expect(completed).toHaveBeenCalledTimes(2);
  expect(jest.getTimerCount()).toBe(1);
});

test('a stale session cancels its pending initial refresh without network or callbacks', async () => {
  const completed = jest.fn();
  register(1000, 'VRSC', API_GET_BALANCES, completed);
  register(1000, 'VRSCTEST', API_GET_TRANSACTIONS, completed);
  mockState = accountState('alice', 2);

  await advance(0);
  await advance(3000);

  expect(mockUpdateWallets).not.toHaveBeenCalled();
  expect(completed).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

test('a session change during a refresh suppresses completion and subsequent polling', async () => {
  const pending = deferred();
  mockUpdateWallets.mockReturnValueOnce(pending.promise);
  const completed = jest.fn();
  register(1000, 'VRSC', API_GET_BALANCES, completed);
  await advance(0);
  expect(mockUpdateWallets).toHaveBeenCalledTimes(1);

  mockState = accountState('bob', 2);
  pending.resolve([]);
  await Promise.resolve();
  await advance(1000);

  expect(mockUpdateWallets).toHaveBeenCalledTimes(1);
  expect(completed).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

test('unregistering during an in-flight refresh skips only that registration completion', async () => {
  const pending = deferred();
  mockUpdateWallets.mockReturnValueOnce(pending.promise);
  const removedComplete = jest.fn();
  const retainedComplete = jest.fn();
  const removed = register(1000, 'VRSC', API_GET_BALANCES, removedComplete);
  register(1000, 'VRSCTEST', API_GET_BALANCES, retainedComplete);
  await advance(0);

  clearWalletRefreshInterval(removed);
  pending.resolve([]);
  await Promise.resolve();

  expect(removedComplete).not.toHaveBeenCalled();
  expect(retainedComplete).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(1);
});

test('clearing all registrations cancels both the initial refresh and the shared clock', async () => {
  const completed = jest.fn();
  const first = register(1000, 'VRSC', API_GET_BALANCES, completed);
  const second = register(1000, 'VRSCTEST', API_GET_BALANCES, completed);

  clearWalletRefreshInterval(first);
  clearWalletRefreshInterval(second);
  await advance(3000);

  expect(mockUpdateWallets).not.toHaveBeenCalled();
  expect(completed).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

test('different cadences keep their schedules independent', async () => {
  register(1000, 'VRSC', API_GET_BALANCES);
  register(2000, 'VRSCTEST', API_GET_BALANCES);
  await advance(0);

  expect(mockUpdateWallets).toHaveBeenCalledTimes(2);
  expect(jest.getTimerCount()).toBe(2);

  await advance(1000);
  expect(mockUpdateWallets).toHaveBeenCalledTimes(3);
  expect(requestedUpdates(2)).toEqual([
    {chainTicker: 'VRSC', updateId: API_GET_BALANCES},
  ]);

  await advance(1000);
  expect(mockUpdateWallets).toHaveBeenCalledTimes(5);
  expect([requestedUpdates(3), requestedUpdates(4)]).toEqual(expect.arrayContaining([
    [{chainTicker: 'VRSC', updateId: API_GET_BALANCES}],
    [{chainTicker: 'VRSCTEST', updateId: API_GET_BALANCES}],
  ]));
});

test('a later registration joins the existing clock without moving its next tick', async () => {
  register(1000, 'VRSC', API_GET_BALANCES);
  await advance(0);
  await advance(500);

  register(1000, 'VRSCTEST', API_GET_BALANCES);
  await advance(0);
  expect(mockUpdateWallets).toHaveBeenCalledTimes(2);
  expect(requestedUpdates(1)).toHaveLength(2);

  await advance(500);
  expect(mockUpdateWallets).toHaveBeenCalledTimes(3);
  expect(requestedUpdates(2)).toEqual(requestedUpdates(1));
  expect(jest.getTimerCount()).toBe(1);
});
