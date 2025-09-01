import { getSynchronizerInstance } from 'react-native-verus'
import { createJsonRpcResponse } from './jsonResponse'


// Lists addresses associated with a light daemon wallet
export const getAddresses = async (coinId, accountHash, coinProto) => {
  const synchronizer = await getSynchronizerInstance(coinId, coinId)
  return new Promise((resolve, reject) => {
    synchronizer.deriveSaplingAddress()
    .then(res => {   
       const result = createJsonRpcResponse(0, res, null)
       resolve(result);
    })
    .catch(err => {
      reject(err);
    });
  });
}
