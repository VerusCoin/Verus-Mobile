import { makeDlightRequest } from '../callCreators'
import { getSynchronizerInstance } from 'react-native-verus'
import { DLIGHT_PRIVATE_BALANCES } from '../../../../constants/dlightConstants'
import BigNumber from "bignumber.js";

// Get the total private balance associated with a light wallet daemon
export const getPrivateBalance = async (coinId, accountHash, coinProto) => {
  console.log(">>> getPrivateBalance called")
  const synchronizer = await getSynchronizerInstance(accountHash, coinId);
  console.error(">>> getPrivateBalance before Promise block")
     return new Promise((resolve, reject) => {
        synchronizer.getPrivateBalance(accountHash)
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
            result = createJsonRpcResponse(0, res, res.error)
            //console.log("before jsonResponse")
            //const jsonResponse = createJsonRpcResponse("1", res);
            //console.log("getLatestNetworkHeight response: " res);
            resolve(result);
          }
        console.log("getPrivateBalance res = " + JSON.stringify(res));
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