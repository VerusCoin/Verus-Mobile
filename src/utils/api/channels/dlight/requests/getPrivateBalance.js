import { makeDlightRequest } from '../callCreators'
import { DLIGHT_BALANCES } from '../../../../constants/dlightConstants'
import BigNumber from "bignumber.js";

// Get the total private balance associated with a light wallet daemon
export const getPrivateBalance = async (coinId, accountHash, coinProto) => {
  const res = await makeDlightRequest(coinId, accountHash, coinProto, 0, DLIGHT_BALANCES, [])

  return {
    ...res,
    result: res.result ? {
      ...res.result,
      confirmed: BigNumber(res.result.confirmed),
      total: BigNumber(res.result.total)
    } : res.result
  }
}