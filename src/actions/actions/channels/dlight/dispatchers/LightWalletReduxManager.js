import Store from '../../../../../store/index'
import { InitializerConfig, makeSynchronizer, Synchronizer } from 'react-native-verus'
import {
  setConfig,
  initializeWallet,
  openWallet,
  closeWallet,
  deleteWallet,
  startSync,
  stopSync,
  getAddresses
} from '../../../../../utils/api/channels/dlight/callCreators'
import { DEFAULT_PRIVATE_ADDRS } from '../../../../../utils/constants/constants'
import { resolveSequentially } from '../../../../../utils/promises'
import { canRetryDlightInitialization, blockchainQuitError } from './AlertManager'
import {
  ERROR_DLIGHT_INIT,
  STOP_DLIGHT_SYNC,
  SET_ADDRESSES,
  CLOSE_DLIGHT_SOCKET,
  INIT_DLIGHT_CHANNEL_START,
  CLOSE_DLIGHT_CHANNEL,
} from "../../../../../utils/constants/storeType";
import { requestViewingKey, requestSeeds } from '../../../../../utils/auth/authBox'
import { DLIGHT_PRIVATE } from '../../../../../utils/constants/intervalConstants'

// Initializes dlight wallet by either creating a backend native wallet and opening it or just opening it
export const initDlightWallet = async (coinObj) => {
  const { dispatch, getState } = Store
  const State = getState()

  const { settings, authentication, channelStore_dlight_private } = State
  const { dlightSockets, dlightSyncing } = channelStore_dlight_private
  const { activeAccount } = authentication
  const { accountHash } = activeAccount
  const { dlight_endpoints, id, proto } = coinObj

  if (
    activeAccount.keys[coinObj.id] == null ||
    activeAccount.keys[coinObj.id].dlight_private == null
  )
    return Promise.resolve();

  // Depends on settings already being added to redux store and initialized
  let initializationPromises = []

  try {
    if (dlightSyncing[id])
      throw new Error(
        "Something went wrong while initializing " +
          id +
          ". It is marked as already syncing, before it has been added!?"
      );

    if (dlightSockets[id] == null) {
      if (dlight_endpoints == null || !Array.isArray(dlight_endpoints) || dlight_endpoints.length === 0)
        throw new Error(id + " has been requested as a lightwallet client, but it has no servers!")

      const lightWalletEndpointArr = dlight_endpoints[0].split(':')

      if (lightWalletEndpointArr[1] == null || isNaN(lightWalletEndpointArr[1])) 
        throw new Error(id + " lightwallet was requested with port " + lightWalletEndpointArr[1], " this is not a valid port.")

      const accountSeeds = await requestSeeds();
      const seed = accountSeeds[DLIGHT_PRIVATE];
      const config: InitializerConfig = setConfig(id, proto, accountHash, lightWalletEndpointArr[0], Number(lightWalletEndpointArr[1]), seed, 227520, false)
      const Synchronizer = new Synchronizer(config.alias, config.networkName);
      await Synchronizer.initialize(config);
      const saplingAddress = Synchronizer.deriveSaplingAddress()
      console.log("saplingAddress from Synchronizer: " + saplingAddress)
      // TODO: if we instantiate Synchronizer as above, maybe we can pass around the class
      // note: this is just research prodding

      //TODO: use class-transformer to get class from object?

      console.log("Redux: before InitializationPromises")
      initializationPromises = [
        //initializeWallet(
        //  id,
        //  proto,
        //  accountHash,
        //  lightWalletEndpointArr[0],
        //  Number(lightWalletEndpointArr[1]),
        //  DEFAULT_PRIVATE_ADDRS,
//          [await requestViewingKey(coinObj.id, DLIGHT_PRIVATE)]
        //  seed,
        //  227520
        //),
        console.log("before openWallet"),
        //openWallet(id, proto, accountHash, lightWalletEndpointArr[0], Number(lightWalletEndpointArr[1]),seed),
        //startSync(id, proto, accountHash),
        getAddresses(id, accountHash, proto, seed)
      ];
      /*secondInitializationPromises = [
        await getAddresses(id, accountHash, proto, seed)
      ]*/

    } else if (dlightSockets[id] === false) {
      initializationPromises = [
        openWallet(id, proto, accountHash),
        getAddresses(id, accountHash, proto, seed)

//        startSync(id, proto, accountHash),
      ]
    } else {
      throw new Error(id + " is already initialized and connected in lightwalletd mode. Cannot intialize and connect a coin twice.")
    }
  } catch (e) {
    console.warn(e)

    dispatch({
      type: ERROR_DLIGHT_INIT,
      payload: { chainTicker: id, error: e }
    })
  }

   return new Promise((resolve) => {
    console.log("Redux: before resolveSequentially 1st")
    resolveSequentially(initializationPromises)
    .then(console.log("Redux: before dispatch 1st"),
          res => {
      dispatch({
        type: INIT_DLIGHT_CHANNEL_START,
        payload: { chainTicker: id }
      })

      dispatch({
        type: SET_ADDRESSES,
        payload: { chainTicker: id, channel: DLIGHT_PRIVATE, addresses: JSON.stringify(res) },
      })
      console.log("dispatch res: " + JSON.stringify(res))

      resolve()
    })

    /*return new Promise((resolve) => {
        console.log("Redux: before resolveSequentially 2nd")
        resolveSequentially(secondInitializationPromises)
        .then(console.log("Redux: before dispatch 2nd"),
              res => {

          dispatch({
            type: SET_ADDRESSES,
            payload: { chainTicker: id, channel: DLIGHT_PRIVATE, addresses: res },
          })

          console.log("dispatch res: " + JSON.stringify(res))
          resolve()

        })
    })*/
    .catch(err => {
      console.warn(err)

      canRetryDlightInitialization(id)
      .then(canRetry => {
        if (canRetry) {
          return initDlightWallet(coinObj).then(resolve)
        } else {
          dispatch({
            type: ERROR_DLIGHT_INIT,
            payload: { chainTicker: id, error: err }
          })
          
          resolve()
        }
      })
      .catch(e => {
        dispatch({
          type: ERROR_DLIGHT_INIT,
          payload: { chainTicker: id, error: e }
        })
        
        resolve()
      })
    })
  })
}

// Closes and optionally deletes a dlightWallet
export const closeDlightWallet = (coinObj, clearDb) => {
  const { dispatch, getState } = Store
  const State = getState()

  const { channelStore_dlight_private, authentication } = State
  const { dlightSockets, dlightSyncing } = channelStore_dlight_private
  const { activeAccount } = authentication
  const { accountHash } = activeAccount
  const { id, proto } = coinObj

  if (activeAccount.seeds.dlight_private == null) return Promise.resolve()

  let closePromises = []

  try {
    if (dlightSockets[id] === true) {
      if (dlightSyncing[id] === true) {
        closePromises.push(stopSync(id, proto, accountHash))
      } 

      closePromises.push(closeWallet(id, proto, accountHash))

      if (clearDb) {
        closePromises.push(deleteWallet(id, proto, accountHash))
      }
    } else  {
      throw new Error(id + "'s dlight wallet cannot be stopped if it was never started.")
    } 
  } catch (e) {
    console.warn(e)
  }

  return new Promise((resolve) => {
    resolveSequentially(closePromises)
    .then(() => {
      dispatch({
        type: CLOSE_DLIGHT_SOCKET,
        payload: { chainTicker: id }
      })
      dispatch({
        type: STOP_DLIGHT_SYNC,
        payload: { chainTicker: id }
      })
      dispatch({
        type: CLOSE_DLIGHT_CHANNEL,
        payload: { chainTicker: id }
      })

      resolve()
    })
    .catch(err => {
      console.warn(err)

      blockchainQuitError(id)
      .then(canRetry => {
        if (canRetry) {
          return closeDlightWallet(coinObj).then(resolve)
        } else {
          // TODO: Log close errors here and figure out what to do with error status
          resolve()
        }
      })
    })
  })
}
