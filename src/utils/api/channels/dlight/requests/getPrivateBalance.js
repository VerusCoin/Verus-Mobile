import { makeDlightRequest } from '../callCreators'
import { getSynchronizerInstance } from 'react-native-verus'
import { DLIGHT_PRIVATE_BALANCES } from '../../../../constants/dlightConstants'
import { createJsonRpcResponse } from './jsonResponse'

import BigNumber from "bignumber.js";
import { satsToCoins} from '../../../../math'

// Get the total private balance associated with a light wallet daemon
export const getPrivateBalance = async (coinId, accountHash, coinProto) => {
  //console.log(">>> getPrivateBalance called")
  const synchronizer = await getSynchronizerInstance(accountHash, coinId);
  return new Promise((resolve, reject) => {
    synchronizer.getPrivateBalance()
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
          const transformedRes = {
            ...res,
            //TODO: simplify conditional below
            ...(res && res.confirmed && res.total && res.pending && {
              confirmed: satsToCoins(BigNumber(res.confirmed)),
              total: satsToCoins(BigNumber(res.total)),
              pending: satsToCoins(BigNumber(res.pending))
            })
          };
          const result = createJsonRpcResponse(0, transformedRes, transformedRes.error)
          resolve(result);
        }
      })
  })
}