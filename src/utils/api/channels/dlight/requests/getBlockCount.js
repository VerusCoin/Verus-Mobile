import { getSynchronizerInstance } from 'react-native-verus'

// Get the current chain blockheight
export const getBlockCount = (coinId, accountHash, coinProto) => {
  return getSynchronizerInstance(coinId, coinId)
    .then(synchronizer => synchronizer.getLatestNetworkHeight(coinId))
    .catch(error => {
      throw error;
    });
};

/*export const getBlockCount = (coinId, accountHash, coinProto) => {
  const sync = getSynchronizerInstance(coinId, coinId);
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
}*/