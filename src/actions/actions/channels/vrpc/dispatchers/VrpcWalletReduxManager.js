import Store from '../../../../../store/index'
import { VRPC } from '../../../../../utils/constants/intervalConstants';
import {
  INIT_VRPC_CHANNEL_START,
  CLOSE_VRPC_CHANNEL,
} from "../../../../../utils/constants/storeType";
import {
  getContextActionScope,
  scopeSessionAction,
} from '../../../updates/sessionRequests';
import {dispatchChannelCloseRequest} from '../../../../../utils/channelCloseRequests';

export const initVrpcWallet = async (coinObj, requestContext) => {
  const state = Store.getState();
  const {activeAccount} = state.authentication;
  const sessionScope = getContextActionScope(state, requestContext);

  const addresses = activeAccount.keys[coinObj.id]
    ? activeAccount.keys[coinObj.id][VRPC].addresses
    : [];
  
  const addressMap = {}

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i]
    addressMap[addr] = i == 0 ? "Main" : `Wallet ${i + 1}`
  }

  Store.dispatch(scopeSessionAction({
    type: INIT_VRPC_CHANNEL_START,
    payload: {
      chainTicker: coinObj.id,
      systemId: coinObj.system_id,
      endpointAddress: coinObj.vrpc_endpoints[0],
      watchedAddresses: addressMap,
    },
  }, sessionScope));

  return;
};

export const closeVrpcWallet = async (coinObj, _clearDb, requestContext) => {
  const sessionScope = getContextActionScope(Store.getState(), requestContext);
  return dispatchChannelCloseRequest(Store.dispatch, scopeSessionAction({
    type: CLOSE_VRPC_CHANNEL,
    payload: { chainTicker: coinObj.id, systemId: coinObj.system_id, endpointAddress: coinObj.vrpc_endpoints[0] }
  }, sessionScope), requestContext?.teardownTimeoutMs);
}
