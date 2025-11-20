import { getSynchronizerInstance } from 'react-native-verus'
import { createJsonRpcResponse } from './jsonResponse'

// Get the transactions associated with a light daemon wallet
// based on tx type (either "pending", "cleared", "received", "sent", or "all")
export const getZTransactions = async (coinId, accountHash, coinProto, transactionType) => {
  const synchronizer = await getSynchronizerInstance(accountHash, coinId);
  return new Promise((resolve, reject) => {
    synchronizer.getPrivateTransactions()
      .then(res => {
        const result = createJsonRpcResponse(0, res, null);
        resolve(result);
      })
      .catch(err => {
          reject(err);
      });
  })
};
