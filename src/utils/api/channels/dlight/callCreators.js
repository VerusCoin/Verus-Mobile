import VerusLightClient from 'react-native-verus-light-client'

// State requests
export * from './state/synchronizer'
export * from './state/walletFolder'

// JSON-RPC requests
export * from './dlightRequests/getAddresses'
export * from './dlightRequests/getBalance'
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
  return VerusLightClient.request(reqId, method, [coinId, accountHash, coinProto, ...params])
}