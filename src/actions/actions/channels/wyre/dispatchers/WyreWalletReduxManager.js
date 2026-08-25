import Store from '../../../../../store/index'
import {
  INIT_WYRE_COIN_CHANNEL_START,
  CLOSE_WYRE_COIN_CHANNEL,
} from "../../../../../utils/constants/storeType";
import WyreProvider from '../../../../../utils/services/WyreProvider';
import {
  getContextActionScope,
  getContextSessionScope,
  scopeSessionAction,
  sessionScopeIsCurrent,
} from '../../../updates/sessionRequests';

export const initWyreCoinChannel = async (coinObj, requestContext) => {
  const sessionScope = getContextSessionScope(Store.getState(), requestContext);
  await WyreProvider.loadWyreCoinAddresses()

  if (!sessionScopeIsCurrent(Store.getState(), sessionScope)) return;

  Store.dispatch(scopeSessionAction({
    type: INIT_WYRE_COIN_CHANNEL_START,
    payload: { chainTicker: coinObj.id }
  }, sessionScope))

  return
}

export const closeWyreCoinWallet = async (coinObj, _clearDb, requestContext) => {
  const sessionScope = getContextActionScope(Store.getState(), requestContext);
  Store.dispatch(scopeSessionAction({
    type: CLOSE_WYRE_COIN_CHANNEL,
    payload: { chainTicker: coinObj.id }
  }, sessionScope))

  return
}
