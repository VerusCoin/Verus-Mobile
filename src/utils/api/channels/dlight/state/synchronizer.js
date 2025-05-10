//import VerusLightClient from 'react-native-verus-light-client'
import { getSynchronizerInstance, InitializerConfig } from 'react-native-verus'
import Store from '../../../../../store/index';
import {
DLIGHT_BALANCE_UPDATED,
DLIGHT_STATUS_UPDATED,
DLIGHT_TRANSACTIONS_UPDATED,
DLIGHT_SYNC_UPDATED
} from '../../../../constants/storeType'

// Uses a coin's ticker symbol (id), protocol (btc || vrsc)
// and user's account hash to identify a light client wallet
// and start syncing it to the blockchain
export const startSync = async (coinId, coinProto, accountHash) => {
  const { dispatch } = Store
  const synchronizer = getSynchronizerInstance(accountHash, coinId)
      const subscriptions = {
        onBalanceChanged: (balance) => {
          console.log("Balance Updated:", balance);
          dispatch({ type: DLIGHT_BALANCE_UPDATED, id: coinId, payload: balance });
        },
        onStatusChanged: (status) => {
          console.log("Status Updated:", status);
          dispatch({ type: DLIGHT_STATUS_UPDATED, id: coinId, payload: status });
        },
        onTransactionsChanged: (transactions) => {
          console.log("Transactions Updated:", transactions);
          dispatch({ type: DLIGHT_TRANSACTIONS_UPDATED, id: coinId, payload: transactions });
        },
        onUpdate: (update) => {
          console.log("Update Received:", update);
          dispatch({ type: DLIGHT_SYNC_UPDATED, id: coinId, payload: update }); //TODO: figure out how to open DLIGHT_SOCKET and toggle DLIGHT_SYNC
        }
      };
      synchronizer.subscribe(subscriptions)
      return true
  //synchronizer.subscribe()
}

// Uses a coin's ticker symbol (id), protocol (btc || vrsc)
// and user's account hash to identify a light client wallet
// and stop it syncing to the blockchain
export const stopSync = (coinId, coinProto, accountHash) => {
  const synchronizer = getSynchronizerInstance(accountHash, coinId)
  return synchronizer.stop();
//  return VerusLightClient.stopSync(coinId, coinProto, accountHash)
}

//export default syncInstance;
