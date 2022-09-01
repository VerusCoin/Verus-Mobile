import { IS_PBAAS, IS_ZCASH, IS_PBAAS_ROOT } from '../../utils/constants/intervalConstants'
import { DEFAULT_COIN_UPDATE_PARAMS, DEFAULT_SERVICE_UPDATE_PARAMS } from '../../utils/constants/defaultUpdateParams'
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
  OCCUPY_SERVICE_API_CALL,
  SET_SERVICE_EXPIRE_ID,
  CLEAR_SERVICE_EXPIRE_ID,
  SET_SERVICE_UPDATE_EXPIRED_ID,
  CLEAR_SERVICE_UPDATE_EXPIRED_ID,
  SET_SERVICE_UPDATE_DATA,
  EXPIRE_SERVICE_DATA,
  RENEW_SERVICE_DATA,
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
export const generateUpdateCoinDataAction = (chainStatus, chainTicker, chainTags, enabledChannels, onCompletes = {}, updateParams = DEFAULT_COIN_UPDATE_PARAMS) => {
  if (!chainTicker) throw new Error("No chain ticker specified for generateUpdateCoinDataAction")
  
  let updateIntervalData = {}
  let updateTrackingData = {}
  const isPbaasRoot = chainTags.includes(IS_PBAAS_ROOT)
  const isPbaas = chainTags.includes(IS_PBAAS) || isPbaasRoot
  const isZcash = chainTags.includes(IS_ZCASH)

  for (let key in updateParams) {
    if (!isPbaas && updateParams[key].restrictions.includes(IS_PBAAS)) continue 
    if (!isZcash && updateParams[key].restrictions.includes(IS_ZCASH)) continue 
    if (!isPbaasRoot && updateParams[key].restrictions.includes(IS_PBAAS_ROOT)) continue 
    if (chainTicker && updateParams[key].restrictions.includes(chainTicker.toUpperCase())) continue

    const channelsToUse = enabledChannels.filter(enabledChannel => {
      const parentChannel = enabledChannel.split('.')[0]

      return -1 !== updateParams[key].channels.indexOf(parentChannel);
    })
    
    updateIntervalData[key] = updateParams[key][chainStatus].interval_info
    updateTrackingData[key] = {
      ...updateParams[key][chainStatus].tracking_info,
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

/**
 * Returns an action to initialize all service related API call update data
 * @param {String[]} enabledChannels The enabled channels for the information request e.g. ['wyre_service']
 * @param {Object} onCompletes Object with optional onCompletes to each updateInterval to be called with state and dispatch function.
 * e.g. {get_info: {update_expired_oncomplete: increaseGetInfoInterval}}
 */
 export const generateUpdateServiceDataAction = (enabledChannels, onCompletes = {}) => {  
  let updateIntervalData = {}
  let updateTrackingData = {}

  for (let key in DEFAULT_SERVICE_UPDATE_PARAMS) {
    const channelsToUse = DEFAULT_SERVICE_UPDATE_PARAMS[key].channels.filter(value => -1 !== enabledChannels.indexOf(value))

    updateIntervalData[key] = DEFAULT_SERVICE_UPDATE_PARAMS[key].interval_info
    updateTrackingData[key] = {
      ...DEFAULT_SERVICE_UPDATE_PARAMS[key].tracking_info,
      channels: channelsToUse
    };
    if (onCompletes[key]) updateIntervalData[key] = {...updateIntervalData[key], ...onCompletes[key]}
  }

  return {
    type: SET_SERVICE_UPDATE_DATA,
    updateIntervalData,
    updateTrackingData
  }
}

export const expireCoinData = (chainTicker, dataType) => {
  return {
    type: EXPIRE_COIN_DATA,
    chainTicker,
    dataType
  }
}

export const renewCoinData = (chainTicker, dataType) => {
  return {
    type: RENEW_COIN_DATA,
    chainTicker,
    dataType
  }
}

export const expireServiceData = (dataType) => {
  return {
    type: EXPIRE_SERVICE_DATA,
    dataType
  }
}

export const renewServiceData = (dataType) => {
  return {
    type: RENEW_SERVICE_DATA,
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

export const setCoinExpireTimeoutId = (chainTicker, dataType, timeoutId) => {
  return {
    type: SET_COIN_EXPIRE_ID,
    chainTicker,
    dataType,
    timeoutId
  }
}

export const clearCoinExpireTimeoutId = (chainTicker, dataType) => {
  return {
    type: CLEAR_COIN_EXPIRE_ID,
    chainTicker,
    dataType
  }
}

export const setCoinUpdateExpiredIntervalId = (chainTicker, dataType, intervalId) => {
  return {
    type: SET_COIN_UPDATE_EXPIRED_ID,
    chainTicker,
    dataType,
    intervalId
  }
}

export const clearCoinUpdateExpiredIntervalId = (chainTicker, dataType) => {
  return {
    type: CLEAR_COIN_UPDATE_EXPIRED_ID,
    chainTicker,
    dataType
  }
}

export const occupyServiceApiCall = (dataType) => {
  return {
    type: OCCUPY_SERVICE_API_CALL,
    dataType
  }
}

export const setServiceExpireTimeoutId = (dataType, timeoutId) => {
  return {
    type: SET_SERVICE_EXPIRE_ID,
    dataType,
    timeoutId
  }
}

export const clearServiceExpireTimeoutId = (dataType) => {
  return {
    type: CLEAR_SERVICE_EXPIRE_ID,
    dataType
  }
}

export const setServiceUpdateExpiredIntervalId = (dataType, intervalId) => {
  return {
    type: SET_SERVICE_UPDATE_EXPIRED_ID,
    dataType,
    intervalId
  }
}

export const clearServiceUpdateExpiredIntervalId = (dataType) => {
  return {
    type: CLEAR_SERVICE_UPDATE_EXPIRED_ID,
    dataType
  }
}