import Store from '../../../../../store/index'
import { requestServiceStoredData } from '../../../../../utils/auth/authBox';
import { VERUSID_SERVICE_ID } from '../../../../../utils/constants/services';
import {
  INIT_VERUSID_CHANNEL_START,
  CLOSE_VERUSID_CHANNEL,
  SET_WATCHED_VERUSIDS,
  SET_PENDING_VERUSIDS,
} from "../../../../../utils/constants/storeType";
import { clearOldPendingVerusIds } from '../../../services/dispatchers/verusid/verusid';
import {
  captureSessionScope,
  getContextActionScope,
  scopeSessionAction,
  sessionScopeIsCurrent,
} from '../../../updates/sessionRequests';
import {dispatchChannelCloseRequest} from '../../../../../utils/channelCloseRequests';

const getSessionScope = requestContext =>
  requestContext?.sessionScope ||
  (requestContext?.sessionScoped ? requestContext : null) ||
  captureSessionScope(Store.getState());

const assertSessionCurrent = (sessionScope, requestContext) => {
  if (
    requestContext?.signal?.aborted === true ||
    !sessionScopeIsCurrent(Store.getState(), sessionScope)
  ) {
    const error = new Error('Account changed while VerusID data was loading.');
    error.code = 'SESSION_CHANGED';
    throw error;
  }
};

export const initVerusIdWallet = async (coinObj, requestedContext) => {
  const sessionScope = getSessionScope(requestedContext);
  const requestContext = {...(requestedContext || {}), sessionScope};
  await clearOldPendingVerusIds(requestContext);
  assertSessionCurrent(sessionScope, requestContext);
  const verusidServiceData = await requestServiceStoredData(VERUSID_SERVICE_ID)
  assertSessionCurrent(sessionScope, requestContext);
  Store.dispatch(scopeSessionAction({
    type: INIT_VERUSID_CHANNEL_START,
    payload: {
      chainTicker: coinObj.id,
      systemId: coinObj.system_id,
      endpointAddress: coinObj.vrpc_endpoints[0],
      watchedVerusIds: verusidServiceData.linked_ids
        ? verusidServiceData.linked_ids
        : {},
      pendingIds: verusidServiceData.pending_ids
        ? verusidServiceData.pending_ids
        : {},
    },
  }, sessionScope));

  return
}

export const updateVerusIdWallet = async requestContext => {
  const sessionScope = getSessionScope(requestContext);
  assertSessionCurrent(sessionScope, requestContext);
  const verusidServiceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  assertSessionCurrent(sessionScope, requestContext);

  Store.dispatch(scopeSessionAction({
    type: SET_WATCHED_VERUSIDS,
    payload: {
      watchedVerusIds: verusidServiceData.linked_ids
        ? verusidServiceData.linked_ids
        : {},    
    },
  }, sessionScope));

  return;
};

export const closeVerusIdWallet = async (coinObj, _clearDb, requestContext) => {
  const sessionScope = getContextActionScope(Store.getState(), requestContext);
  return dispatchChannelCloseRequest(Store.dispatch, scopeSessionAction({
    type: CLOSE_VERUSID_CHANNEL,
    payload: { chainTicker: coinObj.id, systemId: coinObj.system_id, endpointAddress: coinObj.vrpc_endpoints[0] }
  }, sessionScope), requestContext?.teardownTimeoutMs);
}

export const updatePendingVerusIds = async (requestContext) => {
  const sessionScope = getSessionScope(requestContext);
  assertSessionCurrent(sessionScope, requestContext);
  const verusidServiceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  assertSessionCurrent(sessionScope, requestContext);
  Store.dispatch(scopeSessionAction({
    type: SET_PENDING_VERUSIDS,
    payload: {
      pendingIds: verusidServiceData.pending_ids
        ? verusidServiceData.pending_ids
        : {},
    },
  }, sessionScope));

  return;
};
