import { makeDlightRequest } from '../callCreators'
import { DLIGHT_INFO } from '../../../../constants/dlightConstants'

// Get the syncing status/information about a blockchain
export const getInfo = (coinId, accountHash, coinProto) => {
  return makeDlightRequest(coinId, accountHash, coinProto, 0, DLIGHT_INFO, [])
}