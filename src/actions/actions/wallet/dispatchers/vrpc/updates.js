import BigNumber from "bignumber.js";
import { getAddressBalances, getAddressDeltas, getAddressMempool, getInfo } from "../../../../../utils/api/channels/vrpc/callCreators";
import { satsToCoins } from "../../../../../utils/math";
import { standardizeVrpcTxObj } from "../../../../../utils/standardization/standardizeTxObj";

export const updateVrpcBalances = async (coinObj, channelId) => {
  const iAddress = channelId.split('.')[1]
  const res = await getAddressBalances(coinObj, [iAddress])

  if (res.error) throw new Error(res.error.message)

  const totalBalance = satsToCoins(BigNumber(res.result.balance)).toString()

  return {
    chainTicker: coinObj.id,
    channel: channelId,
    body: {
      confirmed: totalBalance,
      pending: '0',
      total: totalBalance,
    },
  };
}

export const updateVrpcTransactions = async (coinObj, channelId) => {
  const iAddress = channelId.split('.')[1]
  const deltasRes = await getAddressDeltas(coinObj, [iAddress], true, 1)
  const infoRes = await getInfo(coinObj)

  if (deltasRes.error) throw new Error(deltasRes.error.message)

  let txs = deltasRes.result

  try {
    const mempoolRes = await getAddressMempool(coinObj, [iAddress], true, 1)

    if (mempoolRes.error) throw new Error(mempoolRes.error.message)

    txs = [
      ...mempoolRes.result.map(x => {
        return {...x, mempool: true};
      }),
      ...txs,
    ];
  } catch(e) {
    console.error(e)
  }
  
  const formattedDeltas = []

  // Format address deltas to account for change
  for (let i = 0; i < txs.length; i++) {
    const {satoshis, txid} = txs[i];
    let totalSats = BigNumber(satoshis);

    // Deltas are returned in array where those that share txids are next to
    // eachother
    for (
      let j = i + 1;
      j < txs.length && txs[j].txid === txid;
      j++
    ) {
      i++;
      totalSats = totalSats.plus(BigNumber(txs[j].satoshis));
    }

    formattedDeltas.push(
      standardizeVrpcTxObj(
        {
          ...txs[i],
          satoshis: totalSats.toNumber(),
        },
        coinObj,
        infoRes.result ? infoRes.result.longestchain : null,
      ),
    );
  }

  return {
    chainTicker: coinObj.id,
    channel: channelId,
    body: formattedDeltas,
  };
};