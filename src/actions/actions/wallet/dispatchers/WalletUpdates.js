import { updateBalances } from './UpdateBalances'
import { updateInfo } from './UpdateInfo'
import { updateTransactions } from './UpdateTransactions'
import { updateFiatPrices } from './UpdateFiatPrices'
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
  occupyCoinApiCall
} from "../../../actionCreators";
import { createExpireTimeout } from '../../../actionDispatchers'

// Map of update functions to be able to call them through standardized 
// API call constants. Each function requires the same three parameters: (store, mode, chainTicker)
export const walletUpdates = {
  [API_GET_BALANCES]: updateBalances,
  [API_GET_INFO]: updateInfo,
  [API_GET_TRANSACTIONS]: updateTransactions,
  [API_GET_FIATPRICE]: updateFiatPrices,
}

/**
 * Calls the specified API update function and renews (un-expires) the data in the 
 * redux store if the API call succeeded.
 * @param {Object} state Reference to redux state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} chainTicker Chain ticker symbol of chain being called
 * @param {String} updateId Name of API call to update
 * @param {Function} onExpire (Optional) Function to execute on data expiry
 */
export const udpateWalletData = async (state, dispatch, channels, chainTicker, updateId, onExpire) => {  
  dispatch(occupyCoinApiCall(chainTicker, channels, updateId))
  let noError = false

  try {
    if(await walletUpdates[updateId](state, dispatch, channels, chainTicker)) {
      if (state.updates.coinUpdateIntervals[chainTicker][updateId].expire_timeout !== ALWAYS_ACTIVATED) {        
        dispatch(renewData(chainTicker, updateId))
      }

      if (state.updates.coinUpdateIntervals[chainTicker][updateId].expire_id) {
        //console.log(`Going to clear expire timeout for ${updateId}: ${state.updates.coinUpdateIntervals[chainTicker][updateId].expire_id}`)
        clearTimeout(state.updates.coinUpdateIntervals[chainTicker][updateId].expire_id)
      }
      createExpireTimeout(state.updates.coinUpdateIntervals[chainTicker][updateId].expire_timeout, chainTicker, updateId, onExpire)
      noError = true
    }
  } catch (e) {
    console.warn(e)
  }
  
  return noError
}

/**
 * Calls an api fetch and dispatch function if all conditions of an update are met according
 * to that updates tracker in the store. Returns 'aborted' if api call was not made due to conditions,
 * 'success' if the call succeeded and 'error' if the call failed.
 * @param {Object} state Reference to redux state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String} chainTicker Chain ticker symbol of chain being called
 * @param {String} updateId Name of API call to update
 */
export const conditionallyUpdateWallet = async (state, dispatch, chainTicker, updateId) => {
  const updateInfo = state.updates.coinUpdateTracker[chainTicker][updateId]

  if (updateInfo != null && updateInfo.channels.length > 0) {
    const { coin_bound, update_locations, channels } = updateInfo
    const openChannels = channels.filter(channel => {
      return !(updateInfo.busy[channel] === true)
    })
    const { activeSection, activeCoin, coinMenuFocused } = state.coins

    if (openChannels.length === 0) {
      //dispatch(logDebugWarning(`The ${updateId} call for ${chainTicker} is taking a very long time to complete. This may impact performace.`)
      console.log(`A ${updateId} call for ${chainTicker} has been called while another example of the same call is busy.`)
    } else if (updateInfo && updateInfo.needs_update) {    
      if (coin_bound && (!coinMenuFocused || activeCoin == null || activeCoin.id !== chainTicker)) {
        return API_ABORTED
      } else if (update_locations != null && (!coinMenuFocused || activeSection == null || !update_locations.includes(activeSection.key))) {
        return API_ABORTED
      }

      if(await udpateWalletData(state, dispatch, openChannels, chainTicker, updateId)) {
        return API_SUCCESS
      } else {
        return API_ERROR
      }
    } 
  }
  return API_ABORTED
}