import { conditionallyUpdateWallet } from '../../../actionDispatchers'
import { 
  expireCoinData, 
  setCoinExpireTimeoutId, 
  clearCoinExpireTimeoutId, 
  setCoinUpdateExpiredIntervalId, 
  clearCoinUpdateExpiredIntervalId,
  generateUpdateCoinDataAction,
  setServiceExpireTimeoutId,
  clearServiceExpireTimeoutId,
  expireServiceData,
  generateUpdateServiceDataAction
} from '../../../actionCreators'
import {
  ALWAYS_ACTIVATED,
  NEVER_ACTIVATED,
  CHANNELS,
  VRPC,
  PRE_DATA,
  DEFAULT_INTERVAL_CHANNELS
} from "../../../../utils/constants/intervalConstants";
import Store from '../../../../store/index'
import { clearServiceUpdateExpiredIntervalId, setServiceUpdateExpiredIntervalId } from '../../updateManager';
import { conditionallyUpdateService } from '../../services/dispatchers/updates';
import { SET_ADDRESSES } from '../../../../utils/constants/storeType';
import { getSystemNameFromSystemId, getVerusIdCurrency } from '../../../../utils/CoinData/CoinData';
//TODO: If app is ever used in any server side rendering scenario, switch store
//to a function parameter on all of these functions rather than an import

/**
 * Creates the timeout that will expire data from an API call
 * @param {Integer} timeout Time until expiry in ms
 * @param {String} chainTicker Ticker symbol of chain that data is for
 * @param {String} updateId Name of API call
 * @param {Function} onComplete (Optional) Function to execute on timeout completion
 */
export const createCoinExpireTimeout = (timeout, chainTicker, updateId, onComplete) => {
  if (timeout !== ALWAYS_ACTIVATED && timeout !== NEVER_ACTIVATED) {
    const timeoutId = setTimeout(() => {
      Store.dispatch(expireCoinData(chainTicker, updateId))
      //console.log(`${updateId} expired for ${chainTicker}`)
      if (onComplete != null) onComplete(Store.getState(), Store.dispatch, chainTicker) 
    }, timeout);
    //console.log(`${updateId} expire timeout set to ${timeout} with id ${timeoutId}`)
    
    Store.dispatch(setCoinExpireTimeoutId(chainTicker, updateId, timeoutId))
  } else {
    Store.dispatch(clearCoinExpireTimeoutId(chainTicker, updateId))
  }
}

/**
 * Creates the timeout that will expire data from a service API call
 * @param {Integer} timeout Time until expiry in ms
 * @param {String} updateId Name of API call
 * @param {Function} onComplete (Optional) Function to execute on timeout completion
 */
 export const createServiceExpireTimeout = (timeout, updateId, onComplete) => {
  if (timeout !== ALWAYS_ACTIVATED && timeout !== NEVER_ACTIVATED) {
    const timeoutId = setTimeout(() => {
      Store.dispatch(expireServiceData(updateId))
      if (onComplete != null) onComplete(Store.getState(), Store.dispatch) 
    }, timeout);
    
    Store.dispatch(setServiceExpireTimeoutId(updateId, timeoutId))
  } else {
    Store.dispatch(clearServiceExpireTimeoutId(updateId))
  }
}

/**
 * Creates the interval that will update expired data through an API call
 * @param {Integer} interval Length of interval in ms
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} chainTicker Ticker symbol of chain that data is for
 * @param {String} updateId Name of API call
 * @param {Function} onComplete (Optional) Function to execute on interval completion (every interval)
 */
export const createCoinUpdateExpiredInterval = (interval, chainTicker, updateId, onComplete) => {
  if (interval !== ALWAYS_ACTIVATED && interval !== NEVER_ACTIVATED) {
    //console.log(`${updateId} update expired interval set to ${interval}`)
    const intervalAction = async () => {
      const state = Store.getState()
    
      await conditionallyUpdateWallet(state, Store.dispatch, chainTicker, updateId)
      //console.log(`Call to ${updateId} for ${chainTicker} in ${mode} mode completed with status: ${updateStatus}`)

      if (onComplete != null) onComplete(state, Store.dispatch, chainTicker) 
    }

    intervalAction()
    const intervalId = setInterval(async () => intervalAction(), interval);
    
    Store.dispatch(setCoinUpdateExpiredIntervalId(chainTicker, updateId, intervalId))
  } else {
    Store.dispatch(clearCoinUpdateExpiredIntervalId(chainTicker, updateId))
  }
}

/**
 * Creates the interval that will update expired data through a service API call
 * @param {Integer} interval Length of interval in ms
 * @param {String[]} channels The enabled channels for the information request e.g. ['wyre_service']
 * @param {String} updateId Name of API call
 * @param {Function} onComplete (Optional) Function to execute on interval completion (every interval)
 */
 export const createServiceUpdateExpiredInterval = (interval, updateId, onComplete) => {
  if (interval !== ALWAYS_ACTIVATED && interval !== NEVER_ACTIVATED) {
    const intervalAction = async () => {
      const state = Store.getState()
    
      await conditionallyUpdateService(state, Store.dispatch, updateId)

      if (onComplete != null) onComplete(state, Store.dispatch) 
    }

    intervalAction()
    const intervalId = setInterval(async () => intervalAction(), interval);
    
    Store.dispatch(setServiceUpdateExpiredIntervalId(updateId, intervalId))
  } else {
    Store.dispatch(clearServiceUpdateExpiredIntervalId(updateId))
  }
}

/**
 * Clears all running api intervals for a chain ticker
 * @param {String} chainTicker Ticker of chain to clear intervals for
 */
export const clearAllCoinIntervals = (chainTicker) => {
  const intervalData = Store.getState().updates.coinUpdateIntervals[chainTicker]

  for (let updateType in intervalData) { 
    clearTimeout(intervalData[updateType].expire_id)
    Store.dispatch(clearCoinExpireTimeoutId(chainTicker, updateType))
    clearInterval(intervalData[updateType].update_expired_id)
    Store.dispatch(clearCoinUpdateExpiredIntervalId(chainTicker, updateType))
  }
}

/**
 * Clears all running api intervals for a chain ticker
 * @param {String} chainTicker Ticker of chain to clear intervals for
 */
 export const clearAllServiceIntervals = () => {
  const intervalData = Store.getState().updates.serviceUpdateIntervals

  for (let updateType in intervalData) { 
    clearTimeout(intervalData[updateType].expire_id)
    Store.dispatch(clearServiceExpireTimeoutId(updateType))
    clearInterval(intervalData[updateType].update_expired_id)
    Store.dispatch(clearServiceUpdateExpiredIntervalId(updateType))
  }
}

/**
 * Clears old intervals and creates new ones for a certain point in an added
 * coins lifecycle (e.g. post_sync)
 * @param {Object} coinObj Coin object of chain that data is for
 * @param {Function{}} onCompletes Object with optional onCompletes to each updateInterval to be called with state and dispatch function.
 * e.g. {get_info: {update_expired_oncomplete: increaseGetInfoInterval}}
 * @param {Object} updateParams Object that describes how to update intervals
 * @param {Array<string>} allSeenSystems Array of systemids (i-addresses) that this currency will also exist on in the user's wallet
 */
export const refreshCoinIntervals = (coinObj, onCompletes, updateParams, allSeenSystems = []) => {
  const state = Store.getState()
  const chainTicker = coinObj.id
  const vrpcSupported = coinObj.compatible_channels.includes(VRPC)

  // TODO: Channel manual enabling/disabling
  const { watchedVerusIds } = state.channelStore_verusid
  const { watchedAddresses } = state.channelStore_vrpc

  function setVrpcChannels(addresses) {
    return addresses.map(addr => {
      return allSeenSystems.map(system => {
        const channelId = `${VRPC}.${addr}.${system}`;
        Store.dispatch({
          type: SET_ADDRESSES,
          payload: {chainTicker, channel: channelId, addresses: [addr]},
        });
  
        return channelId;
      })
    }).flat()
  }

  const verusIdCurrency = getVerusIdCurrency(coinObj);
  const verusIdChannels = vrpcSupported && 
    watchedVerusIds[verusIdCurrency] ? setVrpcChannels(Object.keys(watchedVerusIds[verusIdCurrency])) : [];

  const vrpcChannels = vrpcSupported && 
    watchedAddresses[chainTicker] ? setVrpcChannels(Object.keys(watchedAddresses[chainTicker])) : [];

  if (!coinObj) throw new Error(`${chainTicker} is not added for current user. Coins must be added to be used.`)
  
  const updateDataAction = generateUpdateCoinDataAction(
    PRE_DATA,
    chainTicker,
    coinObj.tags,
    [...DEFAULT_INTERVAL_CHANNELS, ...verusIdChannels, ...vrpcChannels],
    onCompletes,
    updateParams,
  );
  const oldIntervalData = state.updates.coinUpdateIntervals[chainTicker]
  const newIntervalData = updateDataAction.updateIntervalData
  const newTrackingData = updateDataAction.updateTrackingData

  if (oldIntervalData) {
    // Clear all previously existing intervals

    for (let updateId in oldIntervalData) {
      clearTimeout(oldIntervalData[updateId].expire_id)
      clearInterval(oldIntervalData[updateId].update_expired_id)
    }
  }

  //Update state
  Store.dispatch(updateDataAction)

  for (let updateId in newIntervalData) {
    if (newTrackingData[updateId].channels.length > 0) {
      const updateExpiredInterval = newIntervalData[updateId].update_expired_interval
      const antiCollisionOffsetMargin = (updateExpiredInterval * 0.30)
      const antiCollisionOffset = Math.floor(
        Math.random() * ((antiCollisionOffsetMargin * 0.5) - 1) * (Math.random() > 0.5 ? 1 : -1)
      );

      createCoinUpdateExpiredInterval(
        newIntervalData[updateId].update_expired_interval + antiCollisionOffset,
        chainTicker,
        updateId,
        newIntervalData[updateId].update_expired_oncomplete
      );
      createCoinExpireTimeout(
        newIntervalData[updateId].expire_timeout,
        chainTicker,
        updateId,
        newIntervalData[updateId].expire_oncomplete
      );
    }
  }
}

/**
 * Clears old intervals (if present) and creates new ones for system updates
 */
 export const refreshServiceIntervals = (onCompletes = {}) => {
  const state = Store.getState()

  const updateDataAction = generateUpdateServiceDataAction(CHANNELS, onCompletes)
  const oldUpdateData = state.updates.serviceUpdateIntervals
  const newIntervalData = updateDataAction.updateIntervalData
  const newTrackingData = updateDataAction.updateTrackingData

  if (oldUpdateData) {
    // Clear all previously existing intervals

    for (let updateId in oldUpdateData) {
      clearTimeout(oldUpdateData[updateId].expire_id)
      clearInterval(oldUpdateData[updateId].update_expired_id)
    }
  }

  //Update state
  Store.dispatch(updateDataAction)

  for (let updateId in newIntervalData) {
    if (newTrackingData[updateId].channels.length > 0) {
      createServiceUpdateExpiredInterval(
        newIntervalData[updateId].update_expired_interval,
        updateId,
        newIntervalData[updateId].update_expired_oncomplete
      );
      createServiceExpireTimeout(
        newIntervalData[updateId].expire_timeout,
        updateId,
        newIntervalData[updateId].expire_oncomplete
      );
    }
  }
}