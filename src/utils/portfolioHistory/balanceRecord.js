import BigNumber from 'bignumber.js';
import { SecureStorage, PORTFOLIO_RECORD_STORAGE_INTERNAL_KEY } from '../keychain/secureStore';

let queue = Promise.resolve();
const listeners = new Set();
const enqueue = (operation) => {
  const next = queue.then(operation);
  queue = next.catch(() => {});
  return next;
};
const readAll = async () => JSON.parse(await SecureStorage.getItem(PORTFOLIO_RECORD_STORAGE_INTERNAL_KEY) || '{}');
const save = async (records, accountHash, record) => {
  await SecureStorage.setItem(PORTFOLIO_RECORD_STORAGE_INTERNAL_KEY, JSON.stringify(records));
  listeners.forEach((listener) => listener(accountHash, record));
};
export const subscribeBalanceRecord = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const readBalanceRecord = (accountHash) => enqueue(async () => (await readAll())[accountHash] || null);

// One queue covers the whole read/modify/write, including account deletion and QA replacement.
export const appendBalanceRecord = (accountHash, balances, time = Date.now()) => enqueue(async () => {
  const records = await readAll();
  const record = records[accountHash] || { v: 1, start: time, coins: {} };
  let changed = false;
  Object.entries(balances).forEach(([id, value]) => {
    if (value == null) return;
    const amount = BigNumber(value);
    if (!amount.isFinite() || amount.isNegative()) return;
    const points = record.coins[id] || [];
    const exact = amount.toFixed();
    if (!points.length || points[points.length - 1][1] !== exact) {
      points.push([Math.max(time, points[points.length - 1]?.[0] || record.start), exact]);
      record.coins[id] = points;
      changed = true;
    }
  });
  if (changed) {
    records[accountHash] = record;
    await save(records, accountHash, record);
  }
  return changed || records[accountHash] ? record : null;
});

export const deleteBalanceRecord = (accountHash) => enqueue(async () => {
  const records = await readAll();
  if (!Object.prototype.hasOwnProperty.call(records, accountHash)) return;
  delete records[accountHash];
  await save(records, accountHash, null);
});

// QA can replace one disposable account's record through Metro; no seed or key is needed.
// Shape: {v: 1, start: ms, coins: {coinId: [[ms, 'exact decimal amount'], ...]}}.
export const writeBalanceRecord = (accountHash, record) => enqueue(async () => {
  if (!accountHash || record?.v !== 1 || !Number.isFinite(record.start) || !record.coins
      || Array.isArray(record.coins)) throw new Error('Invalid portfolio record.');
  Object.values(record.coins).forEach((points) => {
    let previous = record.start;
    if (!Array.isArray(points)) throw new Error('Invalid portfolio change points.');
    points.forEach(([time, amount]) => {
      if (!Number.isFinite(time) || time < previous || typeof amount !== 'string'
          || !BigNumber(amount).isFinite() || BigNumber(amount).isNegative()) throw new Error('Invalid portfolio change point.');
      previous = time;
    });
  });
  const records = await readAll();
  records[accountHash] = record;
  await save(records, accountHash, record);
});
