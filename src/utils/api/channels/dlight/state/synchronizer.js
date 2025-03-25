//import VerusLightClient from 'react-native-verus-light-client'
import { getSynchronizerInstance, InitializerConfig } from 'react-native-verus'

/*let syncInstance = null;

class SynchronizerSingleton {
  constructor(alias, network) {
    if (!syncInstance) {
      syncInstance = new Synchronizer(alias, network);
    }
    return syncInstance;
  }
}

export const getSynchronizerInstance = (alias, network) => {
  if (!syncInstance) {
    syncInstance = new Synchronizer(alias, network);
  }
  return syncInstance;
};*/

// Uses a coin's ticker symbol (id), protocol (btc || vrsc)
// and user's account hash to identify a light client wallet
// and start syncing it to the blockchain
export const startSync = (coinId, coinProto, accountHash) => {
  const synchronizer = getSynchronizerInstance(accountHash, coinId)
  //synchronizer.subscribe()
}

// Uses a coin's ticker symbol (id), protocol (btc || vrsc)
// and user's account hash to identify a light client wallet
// and stop it syncing to the blockchain
export const stopSync = (coinId, coinProto, accountHash) => {
  return VerusLightClient.stopSync(coinId, coinProto, accountHash)
}

//export default syncInstance;