import { getSynchronizerInstance, makeSynchronizer, Tools } from 'react-native-verus'
import { NativeEventEmitter, NativeModules } from 'react-native'
import { VRSC_SAPLING_ACTIVATION_HEIGHT, PBAAS_SAPLING_ACTIVATION_HEIGHT } from '../../../../constants/constants'

const DLIGHT_NATIVE_EVENTS = [
  'BalanceEvent',
  'StatusEvent',
  'TransactionEvent',
  'UpdateEvent',
]
const DLIGHT_EVENT_LISTENER_RELEASE_DELAY = 3000

let dlightEventEmitter = null
let dlightEventSubscriptions = []
let dlightEventListenerReleaseTimeout = null
const dlightEventListenerOwners = new Set()

const getDlightListenerOwner = (coinId, accountHash) => `${accountHash}:${coinId}`

const getDlightEventEmitter = () => {
  if (dlightEventEmitter == null && NativeModules.VerusLightClient != null) {
    dlightEventEmitter = new NativeEventEmitter(NativeModules.VerusLightClient)
  }

  return dlightEventEmitter
}

const retainDlightEventListeners = owner => {
  dlightEventListenerOwners.add(owner)

  if (dlightEventListenerReleaseTimeout != null) {
    clearTimeout(dlightEventListenerReleaseTimeout)
    dlightEventListenerReleaseTimeout = null
  }

  if (dlightEventSubscriptions.length > 0) return

  const eventEmitter = getDlightEventEmitter()

  if (eventEmitter == null) return

  dlightEventSubscriptions = DLIGHT_NATIVE_EVENTS.map(eventName =>
    eventEmitter.addListener(eventName, () => {}),
  )
}

const releaseDlightEventListeners = owner => {
  dlightEventListenerOwners.delete(owner)

  if (dlightEventListenerOwners.size > 0) return

  if (dlightEventListenerReleaseTimeout != null) {
    clearTimeout(dlightEventListenerReleaseTimeout)
  }

  dlightEventListenerReleaseTimeout = setTimeout(() => {
    if (dlightEventListenerOwners.size > 0) return

    dlightEventSubscriptions.forEach(subscription => subscription.remove())
    dlightEventSubscriptions = []
    dlightEventListenerReleaseTimeout = null
  }, DLIGHT_EVENT_LISTENER_RELEASE_DELAY)
}

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
  const listenerOwner = getDlightListenerOwner(coinId, accountHash)
  retainDlightEventListeners(listenerOwner)

  try {
    const config = await setConfig(coinId, coinProto, accountHash, host, port, seed, extsk, true);
    const sync = await makeSynchronizer(config);
    return sync;
  } catch (error) {
    releaseDlightEventListeners(listenerOwner)
    throw error;
  }
};

export const setConfig = async (coinId, coinProto, accountHash, host, port, seed, extsk, newWallet) => {
    //TODO: birthday below can be removed, and provided as argument to func, but only once we are 
    // capable of discrete 'scan-from' height (daemon or lwd need to provide a saplingOutput index)
    const birthday = (coinId === "VRSC") ? VRSC_SAPLING_ACTIVATION_HEIGHT : PBAAS_SAPLING_ACTIVATION_HEIGHT;
    const config = {
      mnemonicSeed: seed,
      extsk: extsk ? await Tools.bech32Decode(extsk) : extsk,
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

/**
 * Opens a wallet that has been created before
 * @param {String} coinId The chainticker to create a light wallet client for
 * @param {String} coinProto The protocol the coin is based on (e.g. 'btc' || 'vrsc')
 * @param {String} accountHash The account hash of the user account to create the wallet for
 */
export const openWallet = async (coinId, coinProto, accountHash, host, port, seed, extsk) => {
  const listenerOwner = getDlightListenerOwner(coinId, accountHash)
  retainDlightEventListeners(listenerOwner)

  try {
    const config = await setConfig(coinId, coinProto, accountHash, host, port, seed, extsk, false);
    const sync = await makeSynchronizer(config);
    return sync;

  } catch (error) {
    releaseDlightEventListeners(listenerOwner)
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
      synchronizer.stop()
        .then(result => {
          releaseDlightEventListeners(getDlightListenerOwner(coinId, accountHash))
          resolve(result)
        })
        .catch(reject)
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
       synchronizer.stopAndDeleteWallet(accountHash, coinId)
        .then(result => {
          releaseDlightEventListeners(getDlightListenerOwner(coinId, accountHash))
          resolve(result)
        })
        .catch(reject)
     } catch (error) {
       reject(error);
     }
  });
};
