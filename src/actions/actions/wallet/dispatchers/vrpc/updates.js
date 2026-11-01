import BigNumber from 'bignumber.js';
import {
  getAddressBalances,
  getAddressDeltas,
  getAddressMempool,
  getInfo,
} from '../../../../../utils/api/channels/vrpc/callCreators';
import {satsToCoins} from '../../../../../utils/math';
import {standardizeVrpcTxObj} from '../../../../../utils/standardization/standardizeTxObj';

export const updateVrpcBalances = async (coinObj, channelId, {vrpcRefresh} = {}) => {
  const [, iAddress, systemId] = channelId.split('.');
  const currencyId = coinObj.currency_id;
  const isNative = currencyId === systemId;

  const res = await (vrpcRefresh
    ? vrpcRefresh.getBalance(channelId)
    : getAddressBalances(systemId, [iAddress]));

  if (res.error) throw new Error(res.error.message);

  let totalBalance = '0';

  if (isNative) {
    totalBalance = satsToCoins(BigNumber(res.result.balance)).toString();
  } else if (res.result.currencybalance && res.result.currencybalance[currencyId]) {
    totalBalance = BigNumber(res.result.currencybalance[currencyId]).toString();
  }

  return {
    chainTicker: coinObj.id,
    channel: channelId,
    body: {
      confirmed: totalBalance,
      pending: '0',
      total: totalBalance,
    },
  };
};

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

  const groupedDeltas = new Map();

  // Mempool rows are ordered by timestamp, so transactions received in the same
  // second can be interleaved in a multi-address result. Net all rows of a
  // transaction together while preserving first-seen order and last-row details.
  // Keep pending and confirmed snapshots separate if a transaction appears in both.
  for (const delta of txs) {
    let deltaValue = BigNumber(0);
    const {currencyvalues, satoshis, txid, mempool} = delta;

    if (isNative) {
      deltaValue = satsToCoins(BigNumber(satoshis));
    } else if (currencyvalues && currencyvalues[currencyId]) {
      deltaValue = BigNumber(currencyvalues[currencyId]);
    }

    const key = `${txid}:${Boolean(mempool)}`;
    const previous = groupedDeltas.get(key);

    groupedDeltas.set(key, {
      delta,
      amount: previous ? previous.amount.plus(deltaValue) : deltaValue,
    });
  }

  const formattedDeltas = [];

  for (const {delta, amount} of groupedDeltas.values()) {
    if (!amount.isEqualTo(0)) {
      formattedDeltas.push(
        standardizeVrpcTxObj(
          {...delta, amount: amount.toString()},
          coinObj,
          infoRes.result ? infoRes.result.longestchain : null,
        ),
      );
    }
  }

  return {
    chainTicker: coinObj.id,
    channel: channelId,
    body: formattedDeltas,
  };
};
