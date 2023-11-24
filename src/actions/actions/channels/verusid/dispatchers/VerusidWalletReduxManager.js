import Store from '../../../../../store/index'
import { requestServiceStoredData } from '../../../../../utils/auth/authBox';
import { VERUSID_SERVICE_ID } from '../../../../../utils/constants/services';
import {
  INIT_VERUSID_CHANNEL_START,
  CLOSE_VERUSID_CHANNEL,
  SET_WATCHED_VERUSIDS,
  SET_VERUSID_NOTIFICATIONS,
} from "../../../../../utils/constants/storeType";

export const initVerusIdWallet = async (coinObj) => {
  const verusidServiceData = await requestServiceStoredData(VERUSID_SERVICE_ID)
  Store.dispatch({
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
  });

  return
}

export const updateVerusIdWallet = async () => {
  const verusidServiceData = await requestServiceStoredData(VERUSID_SERVICE_ID);

  Store.dispatch({
    type: SET_WATCHED_VERUSIDS,
    payload: {
      watchedVerusIds: verusidServiceData.linked_ids
        ? verusidServiceData.linked_ids
        : {},    
    },
  });

  return;
};

export const closeVerusIdWallet = async (coinObj) => {
  Store.dispatch({
    type: CLOSE_VERUSID_CHANNEL,
    payload: { chainTicker: coinObj.id, systemId: coinObj.system_id, endpointAddress: coinObj.vrpc_endpoints[0] }
  })

  return
}

export const updateVerusIdNotifications = async () => {
  const verusidServiceData = await requestServiceStoredData(VERUSID_SERVICE_ID);
  Store.dispatch({
    type: SET_VERUSID_NOTIFICATIONS,
    payload: {
      pendingIds: verusidServiceData.pending_ids
        ? verusidServiceData.pending_ids
        : {},
    },
  });

  return;
};