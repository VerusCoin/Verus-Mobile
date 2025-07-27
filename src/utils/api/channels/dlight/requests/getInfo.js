import { getSynchronizerInstance } from 'react-native-verus'
import { createJsonRpcResponse } from './jsonResponse'

// Get the syncing status/information about a blockchain
export const getInfo = async (coinId, accountHash, coinProto) => {
  const synchronizer = await getSynchronizerInstance(coinId, coinId);
   return new Promise((resolve, reject) => {
      synchronizer.getInfo(coinId)
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