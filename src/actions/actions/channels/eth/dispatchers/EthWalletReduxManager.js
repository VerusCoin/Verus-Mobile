import Store from '../../../../../store/index'
import {
  INIT_ETH_CHANNEL_START,
  CLOSE_ETH_CHANNEL,
} from "../../../../../utils/constants/storeType";

export const initEthWallet = async (coinObj) => {
  Store.dispatch({
    type: INIT_ETH_CHANNEL_START,
    payload: { chainTicker: coinObj.id }
  })

  return
}

export const closeEthWallet = async (coinObj) => {
  Store.dispatch({
    type: CLOSE_ETH_CHANNEL,
    payload: { chainTicker: coinObj.id }
  })

  return
}