import { makeDlightRequest } from '../callCreators'
import { getSynchronizerInstance } from 'react-native-verus'
//import { DLIGHT_PRIVATE_TRANSACTIONS } from '../../../../constants/dlightConstants'
//import Store from '../../../../../store/index';
import { createJsonRpcResponse } from './jsonResponse'


// Get the transactions associated with a light daemon wallet
// based on tx type (either "pending", "cleared", "received", "sent", or "all")
export const getZTransactions = async (coinId, accountHash, coinProto, transactionType) => {
    console.error(">>>> getZTransactions Called")
    //console.log(">>> getPrivateBalance called")
    const synchronizer = await getSynchronizerInstance(accountHash, coinId);
    //console.error(">>> getPrivateBalance before Promise block")
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
              //console.log("before jsonResponse")
              //const jsonResponse = createJsonRpcResponse("1", res);
              //console.log("getLatestNetworkHeight response: " res);
              resolve(result);
            }
          //console.log("getPrivateTransactions res = " + JSON.stringify(res));
          })
        })
};
