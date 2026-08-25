import {
  API_ABORTED,
  API_ERROR,
  API_SUCCESS,
  ALWAYS_ACTIVATED,
  API_GET_SERVICE_ACCOUNT,
  API_GET_SERVICE_PAYMENT_METHODS,
  API_GET_SERVICE_TRANSFERS,
  API_GET_SERVICE_RATES,
  API_GET_SERVICE_NOTIFICATIONS
} from '../../../../utils/constants/intervalConstants'
import {
  occupyServiceApiCall,
  releaseServiceApiCall,
  renewServiceData,
} from "../../../actionCreators";
import { createServiceExpireTimeout } from '../../../actionDispatchers'
import { updateServiceAccount } from './UpdateServiceAccount';
import { updateServicePaymentMethods } from './UpdateServicePaymentMethods';
import { updateServiceRates } from './UpdateServiceRates';
import { updateServiceTransfers } from './UpdateServiceTransfers';
import { updateServiceNotifications } from './UpdateServiceNotifications';
import Store from '../../../../store';
import {
  captureSessionScope,
  scopeSessionAction,
  sessionScopeIsCurrent,
} from '../../updates/sessionRequests';

export const serviceUpdates = {
  [API_GET_SERVICE_ACCOUNT]: updateServiceAccount,
  [API_GET_SERVICE_PAYMENT_METHODS]: updateServicePaymentMethods,
  [API_GET_SERVICE_TRANSFERS]: updateServiceTransfers,
  [API_GET_SERVICE_RATES]: updateServiceRates,
  [API_GET_SERVICE_NOTIFICATIONS]: updateServiceNotifications
}

let serviceRefreshSequence = 0;

/**
 * Calls the specified API update function and renews (un-expires) the data in the 
 * redux store if the API call succeeded.
 * @param {Object} state Reference to redux state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} updateId Name of API call to update
 * @param {Function} onExpire (Optional) Function to execute on data expiry
 */
export const updateServiceData = async (state, dispatch, channels, updateId, onExpire) => {  
  const sessionScope = captureSessionScope(state)
  const requestId = `service-refresh:${Date.now()}:${++serviceRefreshSequence}`;
  dispatch(
    scopeSessionAction(
      occupyServiceApiCall(channels, updateId, requestId),
      sessionScope,
    ),
  )
  let noError = false

  try {
    if(await serviceUpdates[updateId](state, dispatch, channels)) {
      if (!sessionScopeIsCurrent(Store.getState(), sessionScope)) return false

      if (state.updates.serviceUpdateIntervals[updateId].expire_timeout !== ALWAYS_ACTIVATED) {        
        dispatch(
          scopeSessionAction(
            renewServiceData(updateId),
            sessionScope,
          ),
        )
      }

      if (state.updates.serviceUpdateIntervals[updateId].expire_id) {
        clearTimeout(state.updates.serviceUpdateIntervals[updateId].expire_id)
      }
      createServiceExpireTimeout(
        state.updates.serviceUpdateIntervals[updateId].expire_timeout,
        updateId,
        onExpire,
        sessionScope,
      )
      noError = true
    }
  } catch (e) {
    console.warn(e)
  } finally {
    dispatch(
      scopeSessionAction(
        releaseServiceApiCall(channels, updateId, requestId),
        sessionScope,
      ),
    )
  }
  
  return noError
}

/**
 * Calls an api fetch and dispatch function if all conditions of an update are met according
 * to that updates tracker in the store. Returns 'aborted' if api call was not made due to conditions,
 * 'success' if the call succeeded and 'error' if the call failed.
 * @param {Object} state Reference to redux state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String} updateId Name of API call to update
 */
export const conditionallyUpdateService = async (state, dispatch, updateId) => {
  const updateInfo = state.updates.serviceUpdateTracker[updateId]

  if (updateInfo != null && updateInfo.channels.length > 0) {
    const { update_locations, channels } = updateInfo
    const openServiceChannels = channels.filter(channel => {
      return (
        !(updateInfo.busy[channel] === true) &&
        state[`channelStore_${channel}`] &&
        state[`channelStore_${channel}`].serviceChannelOpen
      );
    })
    //const { activeSection } = state.services

    if (openServiceChannels.length === 0) {
      //dispatch(logDebugWarning(`The ${updateId} call for ${chainTicker} is taking a very long time to complete. This may impact performace.`)
    } else if (updateInfo && updateInfo.needs_update) {    
      // if (
      //   update_locations != null &&
      //   (activeSection == null ||
      //     !update_locations.includes(activeSection.key))
      // ) {
      //   return API_ABORTED;
      // }

      if(await updateServiceData(state, dispatch, openServiceChannels, updateId)) {
        return API_SUCCESS
      } else {
        return API_ERROR
      }
    } 
  }
  return API_ABORTED
}
