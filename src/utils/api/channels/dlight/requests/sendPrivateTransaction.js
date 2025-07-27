//import { DLIGHT_PRIVATE_SEND_PRIVATE_TX } from '../../../../constants/dlightConstants'
import { preflightPrivateTransaction } from './preflightPrivateTransaction'
import { coinsToSats } from '../../../../math'
import BigNumber from 'bignumber.js'
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants'
import { /*requestPrivKey,*/ requestSeeds } from '../../../../auth/authBox'
import { createJsonRpcResponse } from './jsonResponse'

import { getSynchronizerInstance, SpendInfo, SpendSuccess, SpendFailure } from 'react-native-verus'

// Sends a private transaction with given parameters
export const sendPrivateTransaction = async (coinObj, activeUser, address, amount, params) => {
  const coinId = coinObj.id
  const accountHash = activeUser.accountHash
  const coinProto = coinObj.proto
  
  try {
    if (
      activeUser.keys[coinObj.id] == null ||
      activeUser.keys[coinObj.id][DLIGHT_PRIVATE] == null
    ) {
      throw new Error(
        "Cannot spend transaction because user keys cannot be calculated."
      );
    }

    //let spendingKey;
    let mnemonicSeed;

    try {
      // TODO: we can use spendingKey here instead, but need to modify function,
      // but need to modify function arguments for sendToAddress in RN module

      //spendingKey = await requestPrivKey(coinObj.id, DLIGHT_PRIVATE)
      mnemonicSeed = (await requestSeeds())[DLIGHT_PRIVATE];
    } catch(e) {
      throw new Error(
        "Cannot spend transaction because user keys cannot be calculated."
      );
    }

    const preflight = await preflightPrivateTransaction(coinObj, activeUser, address, amount, params);
    const synchronizer = await getSynchronizerInstance(coinId, coinId);

    if (preflight.err) throw new Error(err.result)
    else {
      const spendInfo: SpendInfo = {
        zatoshi: coinsToSats(BigNumber(preflight.result.value)).toString(),
        toAddress: preflight.result.toAddress,
        memo: preflight.result.memo,
        mnemonicSeed: mnemonicSeed
      }
      return new Promise((resolve, reject) => {
        synchronizer.sendToAddress(spendInfo)
          .then(res => {
            if (res.errorMessage != null) {
              //TODO: make sure this error handling works, it may not
              //console.error("SendPrivateTransaction: res.errorMessage(" + res.errorMessage + "), res.errorCode(" + res.errorCode + ")");
              reject(
                new ApiException(
                  res.errorMessage,
                  res.error.data,
                  coinId,
                  DLIGHT_PRIVATE,
                  res.errorCode
                )
              );
            } else {
              //console.log("SendPrivateTransaction: res.txid(" + res.txid + ")");
              const result = createJsonRpcResponse(0, res, res.error)
              resolve(result);
            }
          })
      })
    }
  } catch(e) {
    return {
      err: true,
      result: e.message
    }
  }
}

