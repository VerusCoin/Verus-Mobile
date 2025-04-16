//import { makeDlightRequest } from '../callCreators'
import { DLIGHT_PRIVATE_SEND_PRIVATE_TX } from '../../../../constants/dlightConstants'
import { preflightPrivateTransaction } from './preflightPrivateTransaction'
import { coinsToSats } from '../../../../math'
import BigNumber from 'bignumber.js'
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants'
import { requestPrivKey, requestSeeds } from '../../../../auth/authBox'

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

    let spendingKey;
    let mnemonicSeed;

    try {
      spendingKey = await requestPrivKey(coinObj.id, DLIGHT_PRIVATE)
      console.log("spendingKey = " + spendingKey)

      let seeds = await requestSeeds();
      mnemonicSeed = accountSeeds[DLIGHT_PRIVATE];
      console.log("mnemonicSeed = " + mnemonicSeed)

    } catch(e) {
      throw new Error(
        "Cannot spend transaction because user keys cannot be calculated."
      );
    }

    const preflight = await preflightPrivateTransaction(coinObj, activeUser, address, amount, params);

    const synchronizer = await getSynchronizerInstance(accountHash, coinId);

    if (preflight.err) throw new Error(err.result)
    else {
      const spendInfo: SpendInfo = {
        zatoshi: coinsToSats(BigNumber(preflight.result.value)).toString(),
        toAddress: preflight.result.toAddress,
        memo: preflight.result.memo,
        mnemonicSeed: mnemonicSeed
      }
      /*let params = [
        coinsToSats(BigNumber(preflight.result.value)).toString(),
        preflight.result.toAddress,
        spendingKey,
      ];*/

      if (preflight.result.fromAddress != null) params.push(preflight.result.fromAddress)
      if (preflight.result.memo != null) params.push(preflight.result.memo)

      //return makeDlightRequest(coinId, accountHash, coinProto, 0, DLIGHT_PRIVATE_SEND_PRIVATE_TX, params)
        return new Promise((resolve, reject) => {
          synchronizer.sendToAddress(spendInfo)
            .then(res => {
              if (res.errorMessage != null) {
                console.error("SendPrivateTransaction: res.errorMessage(" + res.errorMessage + "), res.errorCode(" + res.errorCode + ")");

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
                console.warn("SendPrivateTransaction: res.txId(" + res.txId + "), res.raw(" + raw + ")");
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

