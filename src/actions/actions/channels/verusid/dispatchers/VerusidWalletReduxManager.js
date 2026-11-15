import Store from '../../../../../store/index'
import { requestServiceStoredData } from '../../../../../utils/auth/authBox';
import { VERUSID_SERVICE_ID } from '../../../../../utils/constants/services';
import {
  INIT_VERUSID_CHANNEL_START,
  CLOSE_VERUSID_CHANNEL,
  SET_WATCHED_VERUSIDS,
  SET_PENDING_VERUSIDS,
} from "../../../../../utils/constants/storeType";
import {publishRegistrationJobs, refreshRegistrationJobs} from '../../../services/dispatchers/verusid/registration';
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

const updateRegistrationSummaries = async (update, requestContext) => {
  try {
    await update(requestContext);
  } catch (error) {
    // Registration receipts are separate from linked and pending identities.
    // An unreadable receipt must not prevent wallet access or rewrite its data.
    assertSessionCurrent(requestContext.sessionScope, requestContext);
    if (
      error?.code === 'SESSION_CHANGED' ||
      error?.name === 'AbortError' ||
      error?.code === 'ABORT_ERR' ||
      error?.code === 'ERR_CANCELED'
    ) {
      throw error;
    }

    // Errors can contain protected receipt data; log only a generic message.
    console.warn('Unable to refresh saved identity registration summaries.');
  }
};

export const initVerusIdWallet = async (coinObj, requestedContext) => {
  const sessionScope = getSessionScope(requestedContext);
  const requestContext = {...(requestedContext || {}), sessionScope};
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

  await updateRegistrationSummaries(publishRegistrationJobs, requestContext);
  assertSessionCurrent(sessionScope, requestContext);

  return
}

export const updateVerusIdWallet = async requestContext => {
  const sessionScope = getSessionScope(requestContext);
  requestContext = {...(requestContext || {}), sessionScope};
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

  await updateRegistrationSummaries(refreshRegistrationJobs, requestContext);
  assertSessionCurrent(sessionScope, requestContext);

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
