import { getSynchronizerInstance } from 'react-native-verus'

// Get the current chain blockheight
export const getBlockCount = (coinId, accountHash, coinProto) => {
  const sync = getSynchronizerInstance(accountHash, coinId);
    let res, error = "";

   return new Promise((resolve, reject) => {
      synchronizer.getLatestNetworkHeight(coinId)
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
          //console.log("before jsonResponse")
          //const jsonResponse = createJsonRpcResponse("1", res);
          //console.log("getLatestNetworkHeight response: " res);
          resolve(res);
        }
      })
    })
}
