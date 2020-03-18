import { makeDlightRequest } from '../callCreators'
import { DLIGHT_BLOCKCOUNT } from '../../../../constants/dlightConstants'

// Get the current chain blockheight
export const getBlockCount = (coinId, accountHash, coinProto) => {
  return makeDlightRequest(coinId, accountHash, coinProto, 0, DLIGHT_BLOCKCOUNT, [])
}