import { makeDlightRequest } from '../callCreators'
import { DLIGHT_ADDRESSES } from '../../../../constants/dlightConstants'

// Lists addresses associated with a light daemon wallet
export const getAddresses = (coinId, accountHash, coinProto) => {
  return makeDlightRequest(coinId, accountHash, coinProto, 0, DLIGHT_ADDRESSES, [])
}