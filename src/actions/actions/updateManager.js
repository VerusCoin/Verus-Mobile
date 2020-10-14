import { IS_PBAAS, IS_ZCASH, IS_PBAAS_ROOT } from '../../utils/constants/intervalConstants'
import { DEFAULT_COIN_UPDATE_PARAMS } from '../../utils/constants/defaultUpdateParams'
import {
  SET_COIN_UPDATE_DATA,
  EXPIRE_COIN_DATA,
  RENEW_COIN_DATA,
  SET_COIN_EXPIRE_ID,
  SET_COIN_UPDATE_EXPIRED_ID,
  CLEAR_COIN_EXPIRE_ID,
  CLEAR_COIN_UPDATE_EXPIRED_ID,
  OCCUPY_COIN_API_CALL,
  ENABLE_COIN_API_CALL,
  DISABLE_COIN_API_CALL,
} from "../../utils/constants/storeType";

/**
 * Returns an action to initialize all coin related API call update data
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} chainStatus Current chain status in it's lifecycle ("pre_data" || "syncing" || "post_sync")
 * @param {String} chainTicker The ticker for the chain these updates are for
 * @param {String[]} chainTags Tags associated with the chain to be added, e.g. IS_PBAAS
 * @param {Object} onCompletes Object with optional onCompletes to each updateInterval to be called with state and dispatch function.
 * e.g. {get_info: {update_expired_oncomplete: increaseGetInfoInterval}}
 */
export const generateUpdateCoinDataAction = (chainStatus, chainTicker, chainTags, enabledChannels, onCompletes = {}) => {
  if (!chainTicker) throw new Error("No chain ticker specified for generateUpdateCoinDataAction")
  
  let updateIntervalData = {}
  let updateTrackingData = {}
  const isPbaasRoot = chainTags.includes(IS_PBAAS_ROOT)
  const isPbaas = chainTags.includes(IS_PBAAS) || isPbaasRoot
  const isZcash = chainTags.includes(IS_ZCASH)

  for (let key in DEFAULT_COIN_UPDATE_PARAMS) {
    if (!isPbaas && DEFAULT_COIN_UPDATE_PARAMS[key].restrictions.includes(IS_PBAAS)) continue 
    if (!isZcash && DEFAULT_COIN_UPDATE_PARAMS[key].restrictions.includes(IS_ZCASH)) continue 
    if (!isPbaasRoot && DEFAULT_COIN_UPDATE_PARAMS[key].restrictions.includes(IS_PBAAS_ROOT)) continue 
    if (chainTicker && DEFAULT_COIN_UPDATE_PARAMS[key].restrictions.includes(chainTicker.toUpperCase())) continue

    const channelsToUse = DEFAULT_COIN_UPDATE_PARAMS[key].channels.filter(value => -1 !== enabledChannels.indexOf(value))

    updateIntervalData[key] = DEFAULT_COIN_UPDATE_PARAMS[key][chainStatus].interval_info
    updateTrackingData[key] = {
      ...DEFAULT_COIN_UPDATE_PARAMS[key][chainStatus].tracking_info,
      channels: channelsToUse
    };
    if (onCompletes[key]) updateIntervalData[key] = {...updateIntervalData[key], ...onCompletes[key]}
  }

  return {
    type: SET_COIN_UPDATE_DATA,
    chainTicker,
    updateIntervalData,
    updateTrackingData
  }
}

export const expireData = (chainTicker, dataType) => {
  return {
    type: EXPIRE_COIN_DATA,
    chainTicker,
    dataType
  }
}

export const renewData = (chainTicker, dataType) => {
  return {
    type: RENEW_COIN_DATA,
    chainTicker,
    dataType
  }
}

export const occupyCoinApiCall = (chainTicker, channels, dataType) => {
  let busyChannels = {}
  channels.map(channel => {
    busyChannels[channel] = true
  })

  return {
    type: OCCUPY_COIN_API_CALL,
    payload: {
      chainTicker,
      dataType,
      channels: busyChannels
    }
  }
}

export const enableCoinApiCall = (chainTicker, dataType) => {
  return {
    type: ENABLE_COIN_API_CALL,
    chainTicker,
    dataType
  }
}

export const disableCoinApiCall = (chainTicker, dataType) => {
  return {
    type: DISABLE_COIN_API_CALL,
    chainTicker,
    dataType
  }
}

export const setExpireTimeoutId = (chainTicker, dataType, timeoutId) => {
  return {
    type: SET_COIN_EXPIRE_ID,
    chainTicker,
    dataType,
    timeoutId
  }
}

export const clearExpireTimeoutId = (chainTicker, dataType) => {
  return {
    type: CLEAR_COIN_EXPIRE_ID,
    chainTicker,
    dataType
  }
}

export const setUpdateExpiredIntervalId = (chainTicker, dataType, intervalId) => {
  return {
    type: SET_COIN_UPDATE_EXPIRED_ID,
    chainTicker,
    dataType,
    intervalId
  }
}

export const clearUpdateExpiredIntervalId = (chainTicker, dataType) => {
  return {
    type: CLEAR_COIN_UPDATE_EXPIRED_ID,
    chainTicker,
    dataType
  }
}