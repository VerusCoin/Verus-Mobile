import { makeDlightRequest } from '../callCreators'
import { DLIGHT_BALANCES } from '../../../../constants/dlightConstants'

// Get the total balance associated with a light wallet daemon, or of a specific 
// address (if address is null)
export const getBalance = (coinId, accountHash, coinProto, includePending = true, address) => {
  let params = [includePending ? "true" : "false"]
  if (address != null) params.push(address)

  return makeDlightRequest(coinId, accountHash, coinProto, 0, DLIGHT_BALANCES, params)
}