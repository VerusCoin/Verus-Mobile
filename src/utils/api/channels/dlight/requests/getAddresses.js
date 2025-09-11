import { getSynchronizerInstance, Tools } from 'react-native-verus'
import { createJsonRpcResponse } from './jsonResponse'


// Lists addresses associated with a light daemon wallet
export const getAddresses = async (extsk, seed, coinId) => {
  return new Promise((resolve, reject) => {
    Tools.deriveShieldedAddress(extsk, seed, coinId)
    .then(res => {   
       const result = createJsonRpcResponse(0, res, null)
       resolve(result);
    })
    .catch(err => {
      reject(err);
    });
  });
}
