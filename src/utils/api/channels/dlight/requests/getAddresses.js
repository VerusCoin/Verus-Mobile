import { Tools } from 'react-native-verus'
import { createJsonRpcResponse } from './jsonResponse'

// Lists addresses associated with a light daemon wallet
export const getAddresses = async (extsk, seed, coinId) => {
  var spendingKeyHex = "";
  if (extsk) {
    spendingKeyHex = await Tools.bech32Decode(extsk);
  }
  return new Promise((resolve, reject) => {
    Tools.deriveShieldedAddress(spendingKeyHex, seed, coinId)
    .then(res => {
       const result = createJsonRpcResponse(0, res, null)
       resolve(result);
    })
    .catch(err => {
      reject(err);
    });
  });
}
