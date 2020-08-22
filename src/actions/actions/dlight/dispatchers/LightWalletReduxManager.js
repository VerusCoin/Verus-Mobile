import Store from '../../../../store/index'
import {
  initializeWallet,
  openWallet,
  closeWallet,
  deleteWallet,
  startSync,
  stopSync,
  getAddresses
} from '../../../../utils/api/channels/dlight/callCreators'
import { DEFAULT_PRIVATE_ADDRS } from '../../../../utils/constants/constants'
import { resolveSequentially } from '../../../../utils/promises'
import { canRetryDlightInitialization, blockchainQuitError } from './AlertManager'
import {
  ERROR_DLIGHT_INIT,
  OPEN_DLIGHT_SOCKET,
  START_DLIGHT_SYNC,
  STOP_DLIGHT_SYNC,
  SET_DLIGHT_ADDRESSES,
  CLOSE_DLIGHT_SOCKET,
} from "../../../../utils/constants/storeType";

// Initializes dlight wallet by either creating a backend native wallet and opening it or just opening it
export const initDlightWallet = (coinObj) => {
  const { dispatch, getState } = Store
  const State = getState()

  const { coins, settings, authentication } = State
  const { dlightSockets, dlightSyncing } = coins
  const { activeAccount } = authentication
  const { accountHash } = activeAccount
  const { dlightEndpoints, id, proto } = coinObj

  // Depends on settings already being added to redux store and initialized
  const { coinSettings } = settings
  let initializationPromises = []

  try {
    if (dlightSyncing[id]) throw new Error("Something went wrong while initializing " + id + ". It is marked as already syncing, before it has been added!?")

    if (dlightSockets[id] == null) {
      if (dlightEndpoints == null || !Array.isArray(dlightEndpoints) || dlightEndpoints.length === 0)
        throw new Error(id + " has been requested as a lightwallet client, but it has no servers!")

      const lightWalletEndpointArr = dlightEndpoints[0].split(':')

      if (isNaN(lightWalletEndpointArr[1])) 
        throw new Error(id + " lightwallet was requested with port " + lightWalletEndpointArr[1], " this is not a valid port.")

      initializationPromises = [
        initializeWallet(
          id,
          proto,
          accountHash,
          lightWalletEndpointArr[0],
          Number(lightWalletEndpointArr[1]),
          coinSettings[id] != null ? coinSettings[id].privateAddrs : DEFAULT_PRIVATE_ADDRS,
          activeAccount.seeds.dlight
        ),
        openWallet(id, proto, accountHash),
        startSync(id, proto, accountHash),
        getAddresses(id, accountHash, proto)
      ]

    } else if (dlightSockets[id] === false) {
      initializationPromises = [
        openWallet(id, proto, accountHash),
        startSync(id, proto, accountHash),
        getAddresses(id, accountHash, proto)
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
    resolveSequentially(initializationPromises)
    .then(res => {
      dispatch({
        type: OPEN_DLIGHT_SOCKET,
        payload: { chainTicker: id }
      })
      
      dispatch({
        type: START_DLIGHT_SYNC,
        payload: { chainTicker: id }
      })

      dispatch({
        type: SET_DLIGHT_ADDRESSES,
        payload: { chainTicker: id, addresses: res.pop().result }
      })

      resolve()
    })
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
    })
  })
}

// Closes and optionally deletes a dlightWallet
export const closeDlightWallet = (coinObj, clearDb) => {
  const { dispatch, getState } = Store
  const State = getState()

  const { coins, authentication } = State
  const { dlightSockets, dlightSyncing } = coins
  const { activeAccount } = authentication
  const { accountHash } = activeAccount
  const { id, proto } = coinObj

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