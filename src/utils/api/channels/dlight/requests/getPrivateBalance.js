import { makeDlightRequest } from '../callCreators'
import { getSynchronizerInstance } from 'react-native-verus'
import { DLIGHT_PRIVATE_BALANCES } from '../../../../constants/dlightConstants'
import { createJsonRpcResponse } from './jsonResponse'

import BigNumber from "bignumber.js";
import { satsToCoins} from '../../../../math'

// Get the total private balance associated with a light wallet daemon
export const getPrivateBalance = async (coinId, accountHash, coinProto) => {
  console.log(">>> getPrivateBalance called")
  const synchronizer = await getSynchronizerInstance(accountHash, coinId);
  console.error(">>> getPrivateBalance before Promise block")
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

            // TODO: resolve `total.minus is not a function` error here.
            // Showing ERROR_BALANCES in Reactotron

            console.log("getPrivateBalance createJsonRpcResponse res = " + JSON.stringify(res));

            const transformedRes = {
                ...res,
                ...(res && res.confirmed && res.total && {
                    confirmed: satsToCoins(BigNumber(res.confirmed)),
                    total: satsToCoins(BigNumber(res.total)),
                    pending: satsToCoins(BigNumber(res.pending))
                })
            };

            console.error("transformedResult)" + JSON.stringify(transformedRes))

            const result = createJsonRpcResponse(0, transformedRes, transformedRes.error)


            //console.error("BigNumber(transformedResult.result.total)" + BigNumber(transformedResult.total))
            //console.error("BigNumber(res.result.pending)" + BigNumber(transformedResult.pending))

            //console.log("before jsonResponse")
            //const jsonResponse = createJsonRpcResponse("1", res);
            //console.log("getLatestNetworkHeight response: " res);
            resolve(result);
          }
        })
      })
  //const res = await makeDlightRequest(coinId, accountHash, coinProto, 0, DLIGHT_PRIVATE_BALANCES, [])

  /*return {
    ...res,
    result: res.result ? {
      confirmed: BigNumber(res.result.confirmed),
      total: BigNumber(res.result.total),
      pending: BigNumber(res.result.total).minus(BigNumber(res.result.confirmed))
    } : res.result
  }*/
}