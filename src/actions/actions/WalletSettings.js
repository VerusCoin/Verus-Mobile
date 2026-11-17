import { 
  setAllSettings,
  setCoinSettingsState,
  setBuySellSettingsState,
  setGeneralWalletSettingsState
 } from '../actionCreators'
import {
  loadSettings,
  storeSettings
} from '../../utils/asyncStore/asyncStore';
import {
  normalizeGeneralWalletSettings,
  normalizeSettings,
} from '../../utils/settings/settingsDefaults';
import store from '../../store/index'
//TODO: Maybe dispatch from here instead of VerusMobile main file

let generalSettingsSaveQueue = Promise.resolve()
let queuedGeneralSettingsChanges = null
let queuedGeneralSettingsSaveCount = 0

/**
 * Fetches the wallet settings state from Async Storage and returns a promise that 
 * resolves to an action to be dispatched to the redux store. Rejects on error.
 */
export const initSettings = () => {
  return new Promise((resolve, reject) => {
    loadSettings()
    .then(res => {
      resolve(setAllSettings(normalizeSettings(res)))
    })
    .catch(err => reject(err))
  })
}

/**
 * Saves the wallet settings state to Async storage and returns a promise that resolves
 * to an action to be dispatched to the redux store. Rejects on error.
 * @param {Object} stateChanges State changes to be made to settings
 */
export const saveAllSettings = (stateChanges) => {
  const settings = normalizeSettings({
    ...store.getState().settings,
    ...stateChanges,
  })
  return new Promise((resolve, reject) => {
    storeSettings(settings)
    .then(res => {
      resolve(setAllSettings(normalizeSettings(res)))
    })
    .catch(err => reject(err))
  })
}

/**
 * Saves a single coin settings state change to Async storage and returns a promise that resolves
 * to an action to be dispatched to the redux store. Rejects on error.
 * @param {Object} stateChanges Changes to be made to the coin setting state,
 * @param {String} coinID Coin ID for the coin being modified
 */
export const saveCoinSettings = (stateChanges, coinID) => {
  const settingsState = store.getState().settings
  const coinSettingsForCoin = {...settingsState.coinSettings[coinID], ...stateChanges}
  const coinSettings = {...settingsState.coinSettings, [coinID]: coinSettingsForCoin}

  return new Promise((resolve, reject) => {
    storeSettings({...settingsState, coinSettings})
    .then(() => {
      resolve(setCoinSettingsState(coinSettings))
    })
    .catch(err => reject(err))
  })
}

/**
 * Saves a single buy/sell settings state change to Async storage and returns a promise that resolves
 * to an action to be dispatched to the redux store. Rejects on error.
 * @param {Object} stateChanges Changes to be made to the user's buy/sell setting state
 * @param {String} userID UserID of the user who's buy/sell settings are being modified
 */
export const saveBuySellSettings = (stateChanges, userID) => {
  const settingsState = store.getState().settings
  const buySellSettingsForUser = {...settingsState.buySellSettings[userID], ...stateChanges}
  const buySellSettings = {...settingsState.buySellSettings, [userID]: buySellSettingsForUser}

  return new Promise((resolve, reject) => {
    storeSettings({...settingsState, buySellSettings})
    .then(() => {
      resolve(setBuySellSettingsState(buySellSettings))
    })
    .catch(err => reject(err))
  })
}

/**
 * Saves a general settings state change to Async storage and returns a promise that resolves
 * to an action to be dispatched to the redux store. Rejects on error.
 * @param {Object} stateChanges Changes to be made to the general setting state,
 */
export const saveGeneralSettings = (stateChanges) => {
  const pendingStateChanges = {...stateChanges}
  queuedGeneralSettingsSaveCount += 1

  const saveOperation = generalSettingsSaveQueue.then(async () => {
    const settingsState = store.getState().settings
    const generalWalletSettings = normalizeGeneralWalletSettings({
      ...settingsState.generalWalletSettings,
      ...(queuedGeneralSettingsChanges || {}),
      ...pendingStateChanges,
    })

    await storeSettings({...settingsState, generalWalletSettings})
    queuedGeneralSettingsChanges = {
      ...(queuedGeneralSettingsChanges || {}),
      ...pendingStateChanges,
    }

    return setGeneralWalletSettingsState(generalWalletSettings)
  })

  generalSettingsSaveQueue = saveOperation.catch(() => undefined)

  return saveOperation.finally(() => {
    queuedGeneralSettingsSaveCount -= 1

    if (queuedGeneralSettingsSaveCount === 0) {
      queuedGeneralSettingsChanges = null
    }
  })
}
