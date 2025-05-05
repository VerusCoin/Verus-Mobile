import { makeDlightRequest } from '../callCreators'
import { DLIGHT_INFO } from '../../../../constants/dlightConstants'
import { getSynchronizerInstance } from 'react-native-verus'
import { createJsonRpcResponse } from './jsonResponse'

// Get the syncing status/information about a blockchain
export const getInfo = (coinId, accountHash, coinProto) => {
  //console.log(">>> getInfo called")
  const synchronizer = getSynchronizerInstance(accountHash, coinId);
  //const res = synchronizer.getInfo(accountHash);
  //console.log("getInfo response: " + res);
  //return res;
   return new Promise((resolve, reject) => {
      synchronizer.getInfo(accountHash)
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
          //console.log("before jsonResponse")
          //const jsonResponse = createJsonRpcResponse("1", res);
          //console.log("getLatestNetworkHeight response: " res);
          resolve(result);
        }
     // console.log("getInfo res = " + JSON.stringify(res));
      })
    })
  //return makeDlightRequest(coinId, accountHash, coinProto, 0, DLIGHT_INFO, [])
}