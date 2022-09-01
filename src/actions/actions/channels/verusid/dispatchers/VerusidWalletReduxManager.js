import Store from '../../../../../store/index'
import { requestServiceStoredData } from '../../../../../utils/auth/authBox';
import { VERUSID_SERVICE_ID } from '../../../../../utils/constants/services';
import {
  INIT_VERUSID_CHANNEL_START,
  CLOSE_VERUSID_CHANNEL,
} from "../../../../../utils/constants/storeType";

export const initVerusidWallet = async (coinObj) => {
  const verusidServiceData = await requestServiceStoredData(VERUSID_SERVICE_ID)

  Store.dispatch({
    type: INIT_VERUSID_CHANNEL_START,
    payload: {
      chainTicker: coinObj.id,
      endpointAddress: coinObj.vrpc_endpoints[0],
      watchedVerusIds: verusidServiceData.linked_ids
        ? verusidServiceData.linked_ids
        : {},
    },
  });

  return
}

export const closeVerusidWallet = async (coinObj) => {
  Store.dispatch({
    type: CLOSE_VERUSID_CHANNEL,
    payload: { chainTicker: coinObj.id, endpointAddress: coinObj.vrpc_endpoints[0] }
  })

  return
}