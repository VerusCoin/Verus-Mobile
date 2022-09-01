import BigNumber from "bignumber.js";
import { getAddressBalances, getAddressDeltas } from "../../../../../utils/api/channels/vrpc/callCreators";
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

  if (res.error) throw new Error(res.error.message)

  const parsedTxs = res.result.map(delta => standardizeVrpcTxObj(delta, coinObj))

  return {
    chainTicker: coinObj.id,
    channel: channelId,
    body: parsedTxs,
  };
};