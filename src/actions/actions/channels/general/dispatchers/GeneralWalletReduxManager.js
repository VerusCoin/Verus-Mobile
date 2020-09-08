import Store from '../../../../../store/index'
import {
  INIT_GENERAL_CHANNEL_START,
  CLOSE_GENERAL_CHANNEL,
} from "../../../../../utils/constants/storeType";

export const initGeneralWallet = async (coinObj) => {
  Store.dispatch({
    type: INIT_GENERAL_CHANNEL_START,
    payload: { chainTicker: coinObj.id }
  })

  return
}

export const closeGeneralWallet = async (coinObj) => {
  Store.dispatch({
    type: CLOSE_GENERAL_CHANNEL,
    payload: { chainTicker: coinObj.id }
  })

  return
}