import Store from '../../../../../store/index'
import {
  INIT_GENERAL_CHANNEL_START,
  CLOSE_GENERAL_CHANNEL,
} from "../../../../../utils/constants/storeType";
import {getContextActionScope, scopeSessionAction} from '../../../updates/sessionRequests';

export const initGeneralWallet = async (coinObj, requestContext) => {
  const sessionScope = getContextActionScope(Store.getState(), requestContext);
  Store.dispatch(scopeSessionAction({
    type: INIT_GENERAL_CHANNEL_START,
    payload: { chainTicker: coinObj.id }
  }, sessionScope))

  return
}

export const closeGeneralWallet = async (coinObj, _clearDb, requestContext) => {
  const sessionScope = getContextActionScope(Store.getState(), requestContext);
  Store.dispatch(scopeSessionAction({
    type: CLOSE_GENERAL_CHANNEL,
    payload: { chainTicker: coinObj.id }
  }, sessionScope))

  return
}
