import { preflightPrivateTransaction } from './preflightPrivateTransaction'
import { coinsToSats } from '../../../../math'
import BigNumber from 'bignumber.js'
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants'
import { requestSeeds } from '../../../../auth/authBox'
import { createJsonRpcResponse } from './jsonResponse'
import { isDlightSpendingKey } from '../../../../keys'

import { getSynchronizerInstance, SpendInfo, SpendSuccess, SpendFailure, Tools } from 'react-native-verus'

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

    let extsk = "";
    let mnemonicSeed = "";

    try {
      let seed = (await requestSeeds())[DLIGHT_PRIVATE];
      if (isDlightSpendingKey(seed)) {
        extsk = await Tools.bech32Decode(seed);
      } else {
        mnemonicSeed = seed;
      }
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
        extsk: extsk,
        mnemonicSeed: mnemonicSeed
      }
        return new Promise((resolve, reject) => {
        synchronizer.sendToAddress(spendInfo)
          .then(res => {
            const result = createJsonRpcResponse(0, res, null)
            resolve(result);
          })
          .catch(err => {
            reject(err);
          });
      });
    }
  } catch(e) {
    return {
      err: true,
      result: e.message
    }
  }
}

