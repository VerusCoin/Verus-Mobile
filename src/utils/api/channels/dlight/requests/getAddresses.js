//import { makeDlightRequest } from '../callCreators'
//import { DLIGHT_PRIVATE_ADDRESSES } from '../../../../constants/dlightConstants'
import { syncInstance } from '../state/synchronizer'
import { getSynchronizerInstance } from 'react-native-verus'
import { createJsonRpcResponse } from './jsonResponse'


// Lists addresses associated with a light daemon wallet
export const getAddresses = async (coinId, accountHash, coinProto) => {
 // console.log("getAddresses: accountHash(" + accountHash + "), coinId(" + coinId + ")")
  const synchronizer = getSynchronizerInstance(accountHash, coinId);
  let res, error = "";

 return new Promise((resolve, reject) => {
    synchronizer.deriveSaplingAddress()
    .then(res => {
      if (res.error != null) {
        reject(
          new ApiException(
            res.error.message,
            res.error.data,
            coinId,
            DLIGHT_PRIVATE,
            res.error.code
          )
        );
      } else {
        result = createJsonRpcResponse(0, res, res.error)
        resolve(result);
      }
    })
  })
}
