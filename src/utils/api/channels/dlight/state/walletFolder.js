//import VerusLightClient from 'react-native-verus-light-client'
import { getSynchronizerInstance, InitializerConfig, makeSynchronizer, VerusLightClient } from 'react-native-verus'
//import { syncInstance, SynchronizerSingleton } from './synchronizer';

/**
 * Initializes a wallet for the first time
 * @param {String} coinId The chainticker to create a light wallet client for
 * @param {String} coinProto The protocol the coin is based on (e.g. 'btc' || 'vrsc')
 * @param {String} host The host address for the lightwalletd server to connect to
 * @param {Integer} port The port of the lightwalletd server to connect to
 * @param {String} accountHash The account hash of the user account to create the wallet for
 * @param {Integer} numAddresses The number of addresses (address accounts) to initialize this wallet with
 * @param {String[]} viewingKeys The viewing keys for this wallet (array of viewing keys with indices matching numAddresses)
 * @param {Integer} birthday (optional) The last known blockheight the wallet was created on 
 */
//export const initializeWallet = async (coinId, coinProto, accountHash, host, port, numAddresses, viewingKeys, birthday = 0) => {
export const initializeWallet = async (coinId, coinProto, accountHash, host, port, seed) => {

   const config: InitializerConfig = setConfig(coinId, coinProto, accountHash, host, port, seed, 227520, true);
   try {
     console.log("openWallet: before makeSynchronizer")
     return await makeSynchronizer(config);
   } catch (error) {
     console.warn(error)
   }
};

export const setConfig = (coinId, coinProto, accountHash, host, port, seed, birthday, newWallet) => {
  const config: InitializerConfig = {
    mnemonicSeed: seed,
    defaultHost: host,
    defaultPort: port,
    wif: "",
    networkName: coinId,
    alias: accountHash,
    birthdayHeight: birthday,
    newWallet: newWallet
  }
  return config
}

export const initConfig = (coinId, coinProto, accountHash, host, port, seed, birthday, newWallet) => {
  return setConfig(coinId, coinProto, accountHash, host, port, seed, birthday, newWallet)
}

/**
 * Opens a wallet that has been created before
 * @param {String} coinId The chainticker to create a light wallet client for
 * @param {String} coinProto The protocol the coin is based on (e.g. 'btc' || 'vrsc')
 * @param {String} accountHash The account hash of the user account to create the wallet for
 */
export const openWallet = async (coinId, coinProto, accountHash, host, port, seed) => {
  console.log("openWalletCalled")
  /*const config: InitializerConfig = {
    mnemonicSeed: seed,
    defaultHost: host,
    defaultPort: port,
    wif: "",
    networkName: coinId,
    alias: accountHash, //TODO: not sure what alias is used for here
    birthdayHeight: 227520,
    newWallet: false
 }*/
  const config: InitializerConfig = setConfig(coinId, coinProto, accountHash, host, port, seed, 227520, false);
  try {
    console.log("openWallet: before makeSynchronizer")
    const synchronizer = getSynchronizerInstance(accountHash, coinId);
    return await synchronizer.initialize(config);
  } catch (error) {
    console.warn(error)
  }
}

/**
 * Closes a wallet that is no longer in use, without deleting its database data (blocks, etc.)
 * @param {String} coinId The chainticker to create a light wallet client for
 * @param {String} coinProto The protocol the coin is based on (e.g. 'btc' || 'vrsc')
 * @param {String} accountHash The account hash of the user account to create the wallet for
 */
export const closeWallet = async (coinId, coinProto, accountHash) => {
  try {
    return await VerusLightClient.closeWallet(coinId, coinProto, accountHash)
  } catch (error) {
    throw error
  }
}

/**
 * Deletes a wallet by closing it and deleting all of its data 
 * @param {String} coinId The chainticker to create a light wallet client for
 * @param {String} coinProto The protocol the coin is based on (e.g. 'btc' || 'vrsc')
 * @param {String} accountHash The account hash of the user account to create the wallet for
 */
export const deleteWallet = async (coinId, coinProto, accountHash) => {
  try {
    return await VerusLightClient.deleteWallet(coinId, coinProto, accountHash)
  } catch (error) {
    throw error
  }
}
