import BigNumber from 'bignumber.js';
import {RESERVE_TRANSFER_DESTINATION} from 'verus-typescript-primitives';
import VrpcProvider from '../vrpc/vrpcInterface';
import {getAddressDeltas} from '../api/channels/vrpc/requests/getAddressDeltas';
import {getAddressMempool} from '../api/channels/vrpc/requests/getAddressMempool';
import {getInfo} from '../api/channels/vrpc/requests/getInfo';
import {getTransaction} from '../api/channels/vrpc/requests/getTransaction';

// Pre-launch facts change slowly. Short caches keep Home, the asset screen and
// the wizard from asking the same server again while one person moves
// between them.
const LIST_TTL = 60 * 1000;
const HEIGHT_TTL = 30 * 1000;
const FETCH_CONCURRENCY = 4;

const lists = new Map();
const heights = new Map();
// Parsed transfers of confirmed transactions never change.
const confirmedTransfers = new Map();
const definitionHeights = new Map();

const remember = (cache, key, ttl, load) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < ttl) return cached.promise;
  const entry = {at: Date.now(), promise: null, value: undefined};
  entry.promise = Promise.resolve().then(load);
  cache.set(key, entry);
  entry.promise.then(
    value => {
      entry.value = value;
    },
    () => {
      if (cache.get(key) === entry) cache.delete(key);
    },
  );
  return entry.promise;
};

// The last loaded value, without a request, so a screen can draw its final
// layout at once when another screen already loaded it.
const peek = (cache, key) => cache.get(key)?.value;
export const peekPrelaunchCurrencies = systemId => peek(lists, systemId);
export const peekChainHeight = systemId => peek(heights, systemId);

const resultOf = response => {
  if (response?.error) throw new Error(response.error.message || 'Request failed.');
  return response?.result;
};

// Currency ID → {currencydefinition, bestcurrencystate} for every currency of
// this system that is still before its start block.
export const getPrelaunchCurrencies = systemId =>
  remember(lists, systemId, LIST_TTL, async () => {
    const result = resultOf(
      await VrpcProvider.getEndpoint(systemId).listCurrencies({launchstate: 'prelaunch'}),
    );
    return new Map(
      (result || [])
        .filter(entry => entry?.currencydefinition?.currencyid)
        .map(entry => [entry.currencydefinition.currencyid, entry]),
    );
  });

// Currency ID → name for the currencies a currency holds. Only `getcurrency`
// returns these names; the pre-launch list does not.
const currencyNames = new Map();
export const getCurrencyNames = (systemId, currencyId) =>
  remember(currencyNames, `${systemId}:${currencyId}`, Infinity, async () => {
    const result = resultOf(await VrpcProvider.getEndpoint(systemId).getCurrency(currencyId));
    return result?.currencynames && typeof result.currencynames === 'object'
      ? result.currencynames
      : {};
  });

export const getChainHeight = systemId =>
  remember(heights, systemId, HEIGHT_TTL, async () => {
    const info = resultOf(await getInfo(systemId));
    const height = Number(info?.longestchain || info?.blocks);
    if (!Number.isFinite(height) || height <= 0) throw new Error('Block height unavailable.');
    return height;
  });

const reserveTransferAddress = RESERVE_TRANSFER_DESTINATION.getAddressString();

const paysReserveTransfer = delta =>
  (delta?.sent?.outputs || []).some(output =>
    [].concat(output?.addresses || []).includes(reserveTransferAddress),
  );

// Pre-conversions inside one verbose transaction. Only transfers that pay one
// of `addresses` count: the new currency, and any refund, go to that address.
export const parsePreconversions = (transaction, {targetIds, addresses}) =>
  (transaction?.vout || []).flatMap((output, index) => {
    const transfer = output?.scriptPubKey?.reservetransfer;
    if (!transfer?.preconvert || transfer.refund) return [];
    const targetId = transfer.destinationcurrencyid;
    if (!targetIds.has(targetId) || !addresses.includes(transfer.destination?.address)) {
      return [];
    }
    return Object.entries(transfer.currencyvalues || {})
      .filter(([, amount]) => BigNumber(amount).isGreaterThan(0))
      .map(([currencyId, amount]) => ({
        txid: transaction.txid,
        vout: index,
        targetId,
        currencyId,
        destination: transfer.destination.address,
        amount: BigNumber(amount).toFixed(),
      }));
  });

// The block of a currency's definition. No pre-conversion can be older.
const getDefinitionHeight = async (systemId, entry) => {
  const txid = entry?.currencydefinition?.definitiontxid;
  if (!txid) return null;
  const key = `${systemId}:${txid}`;
  if (!definitionHeights.has(key)) {
    definitionHeights.set(
      key,
      getTransaction(systemId, txid, 1)
        .then(response => {
          const height = Number(resultOf(response)?.height);
          return Number.isFinite(height) && height > 0 ? height : null;
        })
        .catch(() => {
          definitionHeights.delete(key);
          return null;
        }),
    );
  }
  return definitionHeights.get(key);
};

const loadTransfers = async (systemId, txid, mempool, match) => {
  const key = `${systemId}:${txid}`;
  if (!mempool && confirmedTransfers.has(key)) return confirmedTransfers.get(key);
  const transaction = resultOf(await getTransaction(systemId, txid, 1, mempool));
  const transfers = parsePreconversions(transaction, match);
  if (!mempool && Number(transaction?.confirmations) > 0) {
    confirmedTransfers.set(key, transfers);
  }
  return transfers;
};

const mapLimited = async (items, limit, task) => {
  const results = [];
  let next = 0;
  const workers = Array.from({length: Math.min(limit, items.length)}, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
};

// The pre-conversions that `addresses` sent to the given pre-launch
// currencies, read from the blockchain, so they show on every device and after
// a restore. Unconfirmed ones come first, as `pending`.
export const getOwnPreconversions = async (systemId, addresses, prelaunchEntries) => {
  const targets = new Map(
    [...prelaunchEntries].filter(([currencyId]) => currencyId),
  );
  const ownAddresses = [...new Set((addresses || []).filter(Boolean))];
  if (targets.size === 0 || ownAddresses.length === 0) return [];

  const [deltasResponse, mempoolResponse] = await Promise.all([
    getAddressDeltas(systemId, ownAddresses, false, 1),
    getAddressMempool(systemId, ownAddresses, false, 1, true).catch(() => null),
  ]);
  const deltas = resultOf(deltasResponse) || [];
  const mempool = mempoolResponse?.error ? [] : mempoolResponse?.result || [];
  const definitionHeightList = await Promise.all(
    [...targets.values()].map(entry => getDefinitionHeight(systemId, entry)),
  );
  const oldest = definitionHeightList.some(height => height == null)
    ? null
    : Math.min(...definitionHeightList);

  const candidates = new Map();
  for (const delta of deltas) {
    if (!paysReserveTransfer(delta)) continue;
    if (oldest != null && Number(delta.height) < oldest) continue;
    candidates.set(delta.txid, {
      txid: delta.txid,
      pending: false,
      height: delta.height,
      timestamp: delta.blocktime || delta.timestamp || null,
    });
  }
  for (const delta of mempool) {
    if (!paysReserveTransfer(delta) || candidates.has(delta.txid)) continue;
    candidates.set(delta.txid, {
      txid: delta.txid,
      pending: true,
      height: null,
      timestamp: delta.timestamp || null,
    });
  }

  const match = {targetIds: new Set(targets.keys()), addresses: ownAddresses};
  const found = await mapLimited([...candidates.values()], FETCH_CONCURRENCY, async candidate => {
    try {
      const transfers = await loadTransfers(systemId, candidate.txid, candidate.pending, match);
      return transfers.map(transfer => ({...candidate, ...transfer}));
    } catch (error) {
      return [];
    }
  });

  return found
    .flat()
    .sort((first, second) =>
      first.pending !== second.pending
        ? first.pending ? -1 : 1
        : Number(second.timestamp || 0) - Number(first.timestamp || 0),
    );
};

// Total pre-converted per paid currency: [{currencyId, amount}].
export const totalPreconverted = preconversions => {
  const totals = new Map();
  (preconversions || []).forEach(item => {
    totals.set(
      item.currencyId,
      BigNumber(totals.get(item.currencyId) || 0).plus(item.amount),
    );
  });
  return [...totals.entries()].map(([currencyId, amount]) => ({
    currencyId,
    amount: amount.toFixed(),
  }));
};
