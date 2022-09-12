import BigNumber from "bignumber.js";
import { getAddressBalances, getAddressDeltas, getInfo } from "../../../../../utils/api/channels/vrpc/callCreators";
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
  const res = await getAddressDeltas(coinObj, [iAddress])
  const infoRes = await getInfo(coinObj)

  if (res.error) throw new Error(res.error.message)
  
  const formattedDeltas = []

  // Format address deltas to account for change
  for (let i = 0; i < res.result.length; i++) {
    const {satoshis, txid} = res.result[i];
    let totalSats = BigNumber(satoshis);

    // Deltas are returned in array where those that share txids are next to
    // eachother
    for (
      let j = i + 1;
      j < res.result.length && res.result[j].txid === txid;
      j++
    ) {
      i++;
      totalSats = totalSats.plus(BigNumber(res.result[j].satoshis));
    }

    formattedDeltas.push(
      standardizeVrpcTxObj(
        {
          ...res.result[i],
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