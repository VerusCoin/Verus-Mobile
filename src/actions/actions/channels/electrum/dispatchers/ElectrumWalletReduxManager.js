import Store from '../../../../../store/index'
import {
  INIT_ELECTRUM_CHANNEL_START,
  CLOSE_ELECTRUM_CHANNEL,
} from "../../../../../utils/constants/storeType";
import {getContextActionScope, scopeSessionAction} from '../../../updates/sessionRequests';

export const initElectrumWallet = async (coinObj, requestContext) => {
  const sessionScope = getContextActionScope(Store.getState(), requestContext);
  Store.dispatch(scopeSessionAction({
    type: INIT_ELECTRUM_CHANNEL_START,
    payload: { chainTicker: coinObj.id }
  }, sessionScope))

  return
}

export const closeElectrumWallet = async (coinObj, _clearDb, requestContext) => {
  const sessionScope = getContextActionScope(Store.getState(), requestContext);
  Store.dispatch(scopeSessionAction({
    type: CLOSE_ELECTRUM_CHANNEL,
    payload: { chainTicker: coinObj.id }
  }, sessionScope))

  return
}
