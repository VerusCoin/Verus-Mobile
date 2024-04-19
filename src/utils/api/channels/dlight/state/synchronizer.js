//import VerusLightClient from 'react-native-verus-light-client'
import VerusLightClient from 'react-native-verus'

// Uses a coin's ticker symbol (id), protocol (btc || vrsc)
// and user's account hash to identify a light client wallet
// and start syncing it to the blockchain
export const startSync = (coinId, coinProto, accountHash) => {
  return VerusLightClient.startSync(coinId, coinProto, accountHash)
}

// Uses a coin's ticker symbol (id), protocol (btc || vrsc)
// and user's account hash to identify a light client wallet
// and stop it syncing to the blockchain
export const stopSync = (coinId, coinProto, accountHash) => {
  return VerusLightClient.stopSync(coinId, coinProto, accountHash)
}
