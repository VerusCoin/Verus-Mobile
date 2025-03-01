import { makeDlightRequest } from '../callCreators'
import { DLIGHT_PRIVATE_ADDRESSES } from '../../../../constants/dlightConstants'

// Lists addresses associated with a light daemon wallet
export const getAddresses = (coinId, accountHash, coinProto) => {
  const res = makeDlightRequest(coinId, accountHash, coinProto, 0, DLIGHT_PRIVATE_ADDRESSES, [])
  console.warn("getAddresses response: " + res)
  return res
}
