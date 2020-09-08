import { makeDlightRequest } from '../callCreators'
import { DLIGHT_BALANCES } from '../../../../constants/dlightConstants'

// Get the total private balance associated with a light wallet daemon
export const getPrivateBalance = (coinId, accountHash, coinProto) => {
  return makeDlightRequest(coinId, accountHash, coinProto, 0, DLIGHT_BALANCES, [])
}