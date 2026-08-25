import Store from '../../../../../store/index'
import {
  INIT_ERC20_CHANNEL_START,
  CLOSE_ERC20_CHANNEL,
} from "../../../../../utils/constants/storeType";
import {getContextActionScope, scopeSessionAction} from '../../../updates/sessionRequests';
import {dispatchChannelCloseRequest} from '../../../../../utils/channelCloseRequests';

export const initErc20Wallet = async (coinObj, requestContext) => {
  const sessionScope = getContextActionScope(Store.getState(), requestContext);
  Store.dispatch(scopeSessionAction({
    type: INIT_ERC20_CHANNEL_START,
    payload: { chainTicker: coinObj.id, contractAddress: coinObj.currency_id, network: coinObj.network }
  }, sessionScope))

  return
}

export const closeErc20Wallet = async (coinObj, _clearDb, requestContext) => {
  const sessionScope = getContextActionScope(Store.getState(), requestContext);
  return dispatchChannelCloseRequest(Store.dispatch, scopeSessionAction({
    type: CLOSE_ERC20_CHANNEL,
    payload: { chainTicker: coinObj.id, contractAddress: coinObj.currency_id, network: coinObj.network }
  }, sessionScope), requestContext?.teardownTimeoutMs);
}
