import Store from '../../../../../store/index'
import {
  INIT_VRPC_CHANNEL_START,
  CLOSE_VRPC_CHANNEL,
} from "../../../../../utils/constants/storeType";

export const initVrpcWallet = async (coinObj) => {
  Store.dispatch({
    type: INIT_VRPC_CHANNEL_START,
    payload: { chainTicker: coinObj.id, endpointAddress: coinObj.vrpc_endpoints[0] }
  })

  return
}

export const closeVrpcWallet = async (coinObj) => {
  Store.dispatch({
    type: CLOSE_VRPC_CHANNEL,
    payload: { chainTicker: coinObj.id, endpointAddress: coinObj.vrpc_endpoints[0] }
  })

  return
}