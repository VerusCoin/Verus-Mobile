import VerusLightClient from 'react-native-verus-light-client'
import ApiException from '../../errors/apiError'
import { DLIGHT } from '../../../constants/intervalConstants'

// State requests
export * from './state/synchronizer'
export * from './state/walletFolder'

// JSON-RPC requests
export * from './dlightRequests/getAddresses'
export * from './dlightRequests/getPrivateBalance'
export * from './dlightRequests/getBlockCount'
export * from './dlightRequests/getInfo'
export * from './dlightRequests/getTransactions'

/**
 * Makes a request to the light daemon client
 * @param {String} coinId The chain ticker for the coin to make the request for
 * @param {String} accountHash The account hash of the user to make the request for
 * @param {String} coinProto The coin protocol of the coin to make the request for
 * @param {String} reqId The ID of the request, that will be returned in the promise resolution/rejection that the request returns
 * @param {String} method The request type
 * @param {String[]} params Paramters to pass in with the request
 */
export const makeDlightRequest = (coinId, accountHash, coinProto, reqId, method, params) => {
  
  return new Promise((resolve, reject) => {
    VerusLightClient.request(reqId, method, [coinId, coinProto, accountHash, ...params])
    .then(res => {
      console.log("GOT DLIGHT REQUEST RESULT")
      console.log(JSON.stringify(res))
      console.log(typeof res)
      console.log(res.error)
      if (res.error != null) {
        // DELETE/REFACTOR when proper error displays are made
        console.log(" ------- DLIGHT EXCEPTION ------- ")
        console.log(res.error)
        console.log(res.error.message)
        console.log(res.error.data)
        console.log(reqId)
        console.log(params)
        console.log(coinId)
        console.log(coinProto)
        console.log(accountHash)
        console.log(method)
        console.log(" ------- END DLIGHT EXCEPTION ------- ")

        reject(
          new ApiException(
            res.error.message,
            res.error.data,
            coinId,
            DLIGHT,
            res.error.code
          )
        );
      } else resolve(res);
    })
  })
}
