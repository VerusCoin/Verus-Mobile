import { getSynchronizerInstance, InitializerConfig, makeSynchronizer, stopAndDeleteWallet, Tools } from 'react-native-verus'
import { VRSC_SAPLING_ACTIVATION_HEIGHT } from '../../../../constants/constants'
import { DLIGHT_PRIVATE } from '../../../../constants/intervalConstants'
import {
DLIGHT_BALANCE_UPDATED,
DLIGHT_STATUS_UPDATED,
DLIGHT_TRANSACTIONS_UPDATED,
DLIGHT_SYNC_UPDATED
} from '../../../../constants/storeType'

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
export const initializeWallet = async (coinId, coinProto, accountHash, host, port, seed, extsk) => {

     try {
       const config: InitializerConfig = await setConfig(coinId, coinProto, accountHash, host, port, seed, extsk, VRSC_SAPLING_ACTIVATION_HEIGHT, true);
       //console.warn("in initializeWallet, after setting config extsk(" + extsk +")")
       const sync = await makeSynchronizer(config);
       return sync;
     } catch (error) {
       console.warn(error)
     }
};

export const setConfig = async (coinId, coinProto, accountHash, host, port, seed, extsk, birthday, newWallet) => {
  //console.warn("in setConfig extsk(" + extsk + "), coindId(" + coinId +")")
  if (!extsk) {
    const config: InitializerConfig = {
      mnemonicSeed: seed,
      extsk: extsk,
      defaultHost: host,
      defaultPort: port,
      wif: "",
      networkName: coinId,
      alias: accountHash,
      birthdayHeight: birthday,
      newWallet: newWallet
    }
    return config;
  } else {
      const config: InitializerConfig = {
        mnemonicSeed: seed,
        extsk: await Tools.bech32Decode(extsk),
        defaultHost: host,
        defaultPort: port,
        wif: "",
        networkName: coinId,
        alias: accountHash,
        birthdayHeight: birthday,
        newWallet: newWallet
      }
      return config;
  }
}

/**
 * Opens a wallet that has been created before
 * @param {String} coinId The chainticker to create a light wallet client for
 * @param {String} coinProto The protocol the coin is based on (e.g. 'btc' || 'vrsc')
 * @param {String} accountHash The account hash of the user account to create the wallet for
 */
export const openWallet = async (coinId, coinProto, accountHash, host, port, seed, extsk) => {

  try {
    const config: InitializerConfig = await setConfig(coinId, coinProto, accountHash, host, port, seed, extsk, VRSC_SAPLING_ACTIVATION_HEIGHT, false);
    const sync = await makeSynchronizer(config);
    return sync;

  } catch (error) {
    throw error
  }
}

/**
 * Closes a wallet that is no longer in use, without deleting its database data (blocks, etc.)
 * @param {String} coinId The chainticker to create a light wallet client for
 * @param {String} coinProto The protocol the coin is based on (e.g. 'btc' || 'vrsc')
 * @param {String} accountHash The account hash of the user account to create the wallet for
 */
export const closeWallet = (coinId, accountHash, coinProto) => {
  return new Promise((resolve, reject) => {
    try {
      const synchronizer = getSynchronizerInstance(accountHash, coinId);
      resolve(synchronizer.stop());
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Deletes a wallet by closing it and deleting all of its data 
 * @param {String} coinId The chainticker to create a light wallet client for
 * @param {String} coinProto The protocol the coin is based on (e.g. 'btc' || 'vrsc')
 * @param {String} accountHash The account hash of the user account to create the wallet for
 */
export const eraseWallet = (coinId, accountHash, coinProto) => {
  return new Promise((resolve, reject) => {
     try {
       const synchronizer = getSynchronizerInstance(accountHash, coinId);
       resolve(synchronizer.stopAndDeleteWallet(accountHash, coinId))
     } catch (error) {
       reject(error);
     }
  });
};
