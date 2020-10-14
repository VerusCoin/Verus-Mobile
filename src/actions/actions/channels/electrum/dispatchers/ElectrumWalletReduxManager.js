import Store from '../../../../../store/index'
import {
  INIT_ELECTRUM_CHANNEL_START,
  CLOSE_ELECTRUM_CHANNEL,
} from "../../../../../utils/constants/storeType";

export const initElectrumWallet = async (coinObj) => {
  Store.dispatch({
    type: INIT_ELECTRUM_CHANNEL_START,
    payload: { chainTicker: coinObj.id }
  })

  return
}

export const closeElectrumWallet = async (coinObj) => {
  Store.dispatch({
    type: CLOSE_ELECTRUM_CHANNEL,
    payload: { chainTicker: coinObj.id }
  })

  return
}