import { updateAllBalances } from './updateBalances'
import { updateInfo } from './updateInfo'
import { updateTransactions } from './updateTransactions'
import { updateFiatPrice } from './updateFiatPrice'
import {
  API_GET_BALANCES,
  API_GET_INFO,
  API_GET_TRANSACTIONS,
  API_GET_FIATPRICE,
  API_ABORTED,
  API_ERROR,
  API_SUCCESS,
  ALWAYS_ACTIVATED
} from '../../../../utils/constants/intervalConstants'
import {
  renewData,
  occupyCoinApiCall,
  freeCoinApiCall,
} from "../../../actionCreators";
import { createExpireTimeout } from '../../../actionDispatchers'
import { logDebugWarning } from '../../debug/creators/debugWarnings'

// Map of update functions to be able to call them through standardized 
// API call constants. Each function requires the same three parameters: (store, mode, chainTicker)
export const walletUpdates = {
  [API_GET_BALANCES]: updateAllBalances,
  [API_GET_INFO]: updateInfo,
  [API_GET_TRANSACTIONS]: updateTransactions,
  [API_GET_FIATPRICE]: updateFiatPrice,
}

/**
 * Calls the specified API update function and renews (un-expires) the data in the 
 * redux store if the API call succeeded.
 * @param {Object} state Reference to redux state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String} mode native || electrum || eth
 * @param {String} chainTicker Chain ticker symbol of chain being called
 * @param {String} updateId Name of API call to update
 * @param {Function} onExpire (Optional) Function to execute on data expiry
 */
export const udpateWalletData = async (state, dispatch, mode, chainTicker, updateId, onExpire) => {
  dispatch(occupyCoinApiCall(chainTicker, updateId))
  let callCompleted = false

  try {
    if(await walletUpdates[updateId](state, dispatch, mode, chainTicker)) {
      if (state.updates.coinUpdateIntervals[chainTicker][updateId].expire_timeout !== ALWAYS_ACTIVATED) {
        dispatch(renewData(chainTicker, updateId))
      }

      if (state.updates.coinUpdateIntervals[chainTicker][updateId].expire_id) {
        //console.log(`Going to clear expire timeout for ${updateId}: ${state.updates.coinUpdateIntervals[chainTicker][updateId].expire_id}`)
        clearTimeout(state.updates.coinUpdateIntervals[chainTicker][updateId].expire_id)
      }
      createExpireTimeout(state.updates.coinUpdateIntervals[chainTicker][updateId].expire_timeout, chainTicker, updateId, onExpire)
      callCompleted = true
    }
  } catch (e) {
    console.error(e)
  }
  
  dispatch(freeCoinApiCall(chainTicker, updateId))
  
  return callCompleted
}

/**
 * Calls an api fetch and dispatch function if all conditions of an update are met according
 * to that updates tracker in the store. Returns 'aborted' if api call was not made due to conditions,
 * 'success' if the call succeeded and 'error' if the call failed.
 * @param {Object} state Reference to redux state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String} mode native || electrum || eth
 * @param {String} chainTicker Chain ticker symbol of chain being called
 * @param {String} updateId Name of API call to update
 */
export const conditionallyUpdateWallet = async (state, dispatch, mode, chainTicker, updateId) => {
  const updateInfo = state.updates.coinUpdateTracker[chainTicker][updateId]
  
  if (updateInfo && updateInfo.needs_update && !updateInfo.busy) {    
    if (!updateInfo.update_enabled) return API_ABORTED

    if(await udpateWalletData(state, dispatch, mode, chainTicker, updateId)) {
      return API_SUCCESS
    }
    else return API_ERROR
  } else if (updateInfo && updateInfo.needs_update && updateInfo.busy) {
    dispatch(logDebugWarning(`The ${updateId} call for ${chainTicker} is taking a very long time to complete. This may impact performace.`))
  }

  return API_ABORTED
}