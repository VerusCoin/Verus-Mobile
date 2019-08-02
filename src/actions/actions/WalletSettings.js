import { setWalletSettingsState } from '../actionCreators'

import {
  loadWalletSettings,
  storeWalletSettings
} from '../../utils/asyncStore/asyncStore';

/**
 * Fetches the wallet settings state from Async Storage and returns a promise that 
 * resolves to an action to be dispatched to the redux store. Rejects on error.
 */
export const initWalletSettings = () => {
  return new Promise((resolve, reject) => {
    loadWalletSettings()
    .then(res => {
      resolve(setWalletSettingsState(res))
    })
    .catch(err => reject(err))
  })
}

/**
 * Saves the wallet settings state to Async storage and returns a promise that resolves
 * to an action to be dispatched to the redux store. Rejects on error.
 * @param {Object} walletSettingsState The current state of the wallet settings component or reducer
 */
export const saveWalletSettings = (walletSettingsState) => {
  return new Promise((resolve, reject) => {
    storeWalletSettings(walletSettingsState)
    .then(res => {
      resolve(setWalletSettingsState(res))
    })
    .catch(err => reject(err))
  })
}