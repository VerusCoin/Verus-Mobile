import { makeDlightRequest } from '../callCreators'
import { DLIGHT_PRIVATE_ADDRESSES } from '../../../../constants/dlightConstants'
import { Tools } from 'react-native-verus'

// Lists addresses associated with a light daemon wallet
export const getAddresses = async (coinId, accountHash, coinProto, seed) => {
  console.log("getAddresses: accountHash(" + accountHash + "), coinId(" + coinId + ")")
  const res = await Tools.deriveShieldedAddress(seed, coinId)
  //const res = makeDlightRequest(coinId, accountHash, coinProto, 0, DLIGHT_PRIVATE_ADDRESSES, [])
  console.warn("getAddresses response: " + JSON.stringify(res))
  return res
}
