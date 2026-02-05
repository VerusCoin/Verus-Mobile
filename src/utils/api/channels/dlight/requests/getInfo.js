import { getSynchronizerInstance } from 'react-native-verus'
import { createJsonRpcResponse } from './jsonResponse'

// Get the syncing status/information about a blockchain
export const getInfo = (coinId, accountHash, coinProto) => {
  const synchronizer = getSynchronizerInstance(accountHash, coinId)
  return new Promise((resolve, reject) => {
    synchronizer.getInfo()
    .then(res => {
        result = createJsonRpcResponse(0, res, null)
        resolve(result);
    })
    .catch(err => {
      reject(err);
    });
  })
};
