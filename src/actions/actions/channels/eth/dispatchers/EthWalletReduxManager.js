import Store from '../../../../../store/index'
import {
  INIT_ETH_CHANNEL_START,
  CLOSE_ETH_CHANNEL,
} from "../../../../../utils/constants/storeType";
import {getContextActionScope, scopeSessionAction} from '../../../updates/sessionRequests';

export const initEthWallet = async (coinObj, requestContext) => {
  const sessionScope = getContextActionScope(Store.getState(), requestContext);
  Store.dispatch(scopeSessionAction({
    type: INIT_ETH_CHANNEL_START,
    payload: { chainTicker: coinObj.id }
  }, sessionScope))

  return
}

export const closeEthWallet = async (coinObj, _clearDb, requestContext) => {
  const sessionScope = getContextActionScope(Store.getState(), requestContext);
  Store.dispatch(scopeSessionAction({
    type: CLOSE_ETH_CHANNEL,
    payload: { chainTicker: coinObj.id }
  }, sessionScope))

  return
}
