import { getSynchronizerInstance } from 'react-native-verus'
import { createJsonRpcResponse } from './jsonResponse'

// Get the transactions associated with a light daemon wallet
// based on tx type (either "pending", "cleared", "received", "sent", or "all")
export const getZTransactions = async (coinId, accountHash, coinProto, transactionType) => {
    //console.log(">>>> getZTransactions Called")
    const synchronizer = await getSynchronizerInstance(accountHash, coinId);
    return new Promise((resolve, reject) => {
      synchronizer.getPrivateTransactions()
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
          //console.log("getPrivateTransactions res = " + JSON.stringify(res));
        })
    })
};
