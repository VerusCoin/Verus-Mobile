import BigNumber from "bignumber.js";
import { getAddressBalances, getAddressDeltas, getAddressMempool, getInfo } from "../../../../../utils/api/channels/vrpc/callCreators";
import { satsToCoins } from "../../../../../utils/math";
import { standardizeVrpcTxObj } from "../../../../../utils/standardization/standardizeTxObj";
import {finiteBalance} from '../../../../../utils/assets/assetIdentity';

export const updateVrpcBalances = async (coinObj, channelId, {vrpcRefresh} = {}) => {
  const [channelName, iAddress, systemId] = channelId.split('.')

  const currencyId = coinObj.currency_id

  const readBalanceAndMempool = async fresh => {
    const balanceRes = await (!fresh && vrpcRefresh ? vrpcRefresh.getBalance(channelId) : getAddressBalances(systemId, [iAddress], undefined, fresh));
    if (balanceRes.error) throw new Error(balanceRes.error.message);

    const mempool = await (!fresh && vrpcRefresh ? vrpcRefresh.getMempool(channelId) : getAddressMempool(systemId, [iAddress], false, 1, fresh));
    if (mempool.error) throw new Error(mempool.error.message);
    if (!Array.isArray(mempool.result)) throw new Error('Mempool response unavailable');

    return [balanceRes, mempool];
  };

  let [res, mempoolRes] = await readBalanceAndMempool(false);

  // The two answers are cached for different times. Right after a block, a new
  // balance with an older mempool counts the same transaction twice. While the
  // mempool lists anything, read both again, uncached and back to back.
  if (mempoolRes.result.length > 0) {
    [res, mempoolRes] = await readBalanceAndMempool(true);
  }

  // A missing/malformed response is unavailable, not an empty wallet. Retain
  // the complete map for discovery on this exact address/system channel.
  const nativeBalance = finiteBalance(res.result?.balance);
  const currencyBalances = res.result?.currencybalance || {};
  if (nativeBalance == null || typeof currencyBalances !== 'object' ||
      Array.isArray(currencyBalances)) {
    throw new Error('Balance response unavailable');
  }
  const currencies = {};
  for (const [id, value] of Object.entries(currencyBalances)) {
    const balance = finiteBalance(value);
    if (balance == null) throw new Error('Currency balance unavailable');
    currencies[id] = balance.toString();
  }
  currencies[systemId] = satsToCoins(nativeBalance).toString();

  const confirmedBalance = currencies[currencyId] || '0';

  // Native deltas are signed satoshis. Reserve deltas are signed coin amounts.
  // Use satoshis for the system currency so currencyvalues cannot count it twice.
  for (const delta of mempoolRes.result) {
    if (delta?.satoshis == null || delta.satoshis === '' || typeof delta.satoshis === 'boolean' ||
        !BigNumber(delta.satoshis).isFinite() ||
        !BigNumber(delta.satoshis).isInteger()) {
      throw new Error('Mempool balance unavailable');
    }
    const reserves = delta.currencyvalues || {};
    if (typeof reserves !== 'object' || Array.isArray(reserves)) {
      throw new Error('Mempool currency balance unavailable');
    }
    const changes = {...reserves, [systemId]: satsToCoins(BigNumber(delta.satoshis)).toString()};
    for (const [id, value] of Object.entries(changes)) {
      if (value == null || value === '' || typeof value === 'boolean' ||
          !BigNumber(value).isFinite()) {
        throw new Error('Mempool currency balance unavailable');
      }
      currencies[id] = BigNumber(currencies[id] || 0).plus(value).toString();
    }
  }
  // Inconsistent chain/mempool snapshots must not replace a known balance.
  if (Object.values(currencies).some(value => finiteBalance(value) == null)) {
    throw new Error('Balance response inconsistent with mempool');
  }
  const totalBalance = currencies[currencyId] || '0';

  return {
    chainTicker: coinObj.id,
    channel: channelId,
    assetDiscovery: {systemId, address: iAddress, testnet: Boolean(coinObj.testnet), currencies},
    body: {
      confirmed: confirmedBalance,
      pending: BigNumber(totalBalance).minus(confirmedBalance).toString(),
      total: totalBalance,
    },
  };
}

export const updateVrpcTransactions = async (coinObj, channelId, {vrpcRefresh} = {}) => {
  const [, iAddress, systemId] = channelId.split('.');

  // These reads have independent inputs. A coordinated refresh supplies them
  // from one planned batch; standalone callers can start all three immediately.
  // Mempool remains best effort so a temporary failure does not hide history.
  const [deltasRes, infoRes, mempoolRes] = await (vrpcRefresh
    ? vrpcRefresh.getTransactions(channelId)
    : Promise.all([
      getAddressDeltas(systemId, [iAddress], true, 1),
      getInfo(systemId),
      Promise.resolve()
        .then(() => getAddressMempool(systemId, [iAddress], true, 1))
        .catch(error => ({error})),
    ]));

  const currencyId = coinObj.currency_id;
  const isNative = currencyId === systemId;

  if (deltasRes.error) throw new Error(deltasRes.error.message);

  let txs = deltasRes.result;

  try {
    if (mempoolRes.error) throw new Error(mempoolRes.error.message);

    txs = [
      ...mempoolRes.result.map(delta => ({...delta, mempool: true})),
      ...txs,
    ];
  } catch (error) {
    console.error(error);
  }

  const grouped = new Map();
  const confirmedTxids = new Set(txs.filter(tx => !tx.mempool).map(tx => tx.txid));

  // Group by identity, not index order. Keep spend metadata even when the
  // last delta is change. Prefer confirmed data if the two RPC snapshots overlap.
  for (const delta of txs) {
    if (delta.mempool && confirmedTxids.has(delta.txid)) continue;

    const previous = grouped.get(delta.txid);
    const value = isNative
      ? satsToCoins(BigNumber(delta.satoshis))
      : BigNumber(delta.currencyvalues?.[currencyId] || 0);
    grouped.set(delta.txid, {
      ...delta,
      sent: delta.sent || previous?.sent,
      timestamp: previous?.timestamp ?? delta.timestamp,
      amount: BigNumber(previous?.amount || 0).plus(value).toString(),
    });
  }

  const formattedDeltas = [...grouped.values()]
    .filter(tx => !BigNumber(tx.amount).isZero())
    .map(tx =>
      standardizeVrpcTxObj(
        tx,
        coinObj,
        infoRes.result ? infoRes.result.longestchain : null,
        systemId,
      ),
    );

  return {
    chainTicker: coinObj.id,
    channel: channelId,
    body: formattedDeltas,
  };
};
