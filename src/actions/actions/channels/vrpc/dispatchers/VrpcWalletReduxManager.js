import Store from '../../../../../store/index'
import { VRPC } from '../../../../../utils/constants/intervalConstants';
import {
  INIT_VRPC_CHANNEL_START,
  CLOSE_VRPC_CHANNEL,
} from "../../../../../utils/constants/storeType";

export const initVrpcWallet = async coinObj => {
  const state = Store.getState();
  const {activeAccount} = state.authentication;

  const addresses = activeAccount.keys[coinObj.id]
    ? activeAccount.keys[coinObj.id][VRPC].addresses
    : [];
  
  const addressMap = {}

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i]
    addressMap[addr] = i == 0 ? "Main" : `Wallet ${i + 1}`
  }

  Store.dispatch({
    type: INIT_VRPC_CHANNEL_START,
    payload: {
      chainTicker: coinObj.id,
      endpointAddress: coinObj.vrpc_endpoints[0],
      watchedAddresses: addressMap,
    },
  });

  return;
};

export const closeVrpcWallet = async (coinObj) => {
  Store.dispatch({
    type: CLOSE_VRPC_CHANNEL,
    payload: { chainTicker: coinObj.id, endpointAddress: coinObj.vrpc_endpoints[0] }
  })

  return
}