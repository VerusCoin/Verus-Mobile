import { getSynchronizerInstance } from 'react-native-verus'
import { createJsonRpcResponse } from './jsonResponse'

// Get the syncing status/information about a blockchain
export const getInfo = (coinId, accountHash, coinProto) => {
  return getSynchronizerInstance(coinId, coinId)
    .then(synchronizer => synchronizer.getInfo(coinId))
    .then(res => createJsonRpcResponse(0, res, res.error))
    .catch(error => {
      throw error;
    });
};
