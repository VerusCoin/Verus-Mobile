import { makeDlightRequest } from '../callCreators'
import { DLIGHT_PRIVATE_BALANCES } from '../../../../constants/dlightConstants'
import BigNumber from "bignumber.js";

// Get the total private balance associated with a light wallet daemon
export const getPrivateBalance = async (coinId, accountHash, coinProto) => {
  const res = await makeDlightRequest(coinId, accountHash, coinProto, 0, DLIGHT_PRIVATE_BALANCES, [])

  return {
    ...res,
    result: res.result ? {
      confirmed: BigNumber(res.result.confirmed),
      total: BigNumber(res.result.total),
      pending: BigNumber(res.result.total).minus(BigNumber(res.result.confirmed))
    } : res.result
  }
}