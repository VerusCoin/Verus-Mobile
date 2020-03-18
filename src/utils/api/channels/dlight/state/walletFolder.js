import VerusLightClient from 'react-native-verus-light-client'

/**
 * creates and initializes a light client wallet for the specified coin 
 * @param {String} coinId The chainticker to create a light wallet client for
 * @param {String} coinProto The protocol the coin is based on (e.g. 'btc' || 'vrsc')
 * @param {String} host The host address for the lightwalletd server to connect to
 * @param {Integer} port The port of the lightwalletd server to connect to
 * @param {String} accountHash The account hash of the user account to create the wallet for
 * @param {Integer} numAddresses The number of addresses (address accounts) to initialize this wallet with
 * @param {String} seed The wallet seed
 */
export const addWallet = (coinId, coinProto, host, port, accountHash, numAddresses, seed) => {
  return VerusLightClient.addWallet(coinId, coinProto, host, port, accountHash, numAddresses, seed)
}