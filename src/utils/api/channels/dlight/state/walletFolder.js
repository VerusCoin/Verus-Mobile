import { getSynchronizerInstance, InitializerConfig, makeSynchronizer } from 'react-native-verus'
import { VRSC_SAPLING_ACTIVATION_HEIGHT } from '../../../../constants/constants'

/**
 * Initializes a wallet for the first time
 * @param {String} coinId The chainticker to create a light wallet client for
 * @param {String} coinProto The protocol the coin is based on (e.g. 'btc' || 'vrsc')
 * @param {String} accountHash The account hash of the user account to create the wallet for
 * @param {String} host The host address for the lightwalletd server to connect to
 * @param {Integer} port The port of the lightwalletd server to connect to
 * @param {Integer} numAddresses The number of addresses (address accounts) to initialize this wallet with
 * @param {String} seed The HDSeed for the wallet in question
 */
//export const initializeWallet = async (coinId, coinProto, accountHash, host, port, numAddresses, viewingKeys, birthday = 0) => {
export const initializeWallet = async (coinId, coinProto, accountHash, host, port, seed) => {

   const config: InitializerConfig = setConfig(coinId, coinProto, accountHash, host, port, seed, VRSC_SAPLING_ACTIVATION_HEIGHT, true);
     try {
       const sync = await makeSynchronizer(config);
       return sync;

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

  //TODO: Everything works, despite this, but openWallet is never called due to dlightSockets logic
  // or something else in initDlight function in LightWalletReduxManager. Since it breaks nothing, I left it be
  //console.log(">>>>>> openWalletCalled")
  const config: InitializerConfig = setConfig(coinId, coinProto, accountHash, host, port, seed, VRSC_SAPLING_ACTIVATION_HEIGHT, false);
  try {
    //console.log("openWallet: before makeSynchronizer")
    const sync = await makeSynchronizer(config);
    return sync;

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
  //console.warn(">>> closeWallet called")
  try {
    const synchronizer = getSynchronizerInstance(accountHash, coinId);
    return await synchronizer.stop()
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
  //TODO: no way to delete wallet presently without uninstalling app
  // can add this, if we need it
  try {
    return await VerusLightClient.deleteWallet(coinId, coinProto, accountHash)
  } catch (error) {
    throw error
  }
}
