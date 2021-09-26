import Store from '../../../../../store/index'
import {
  INIT_WYRE_COIN_CHANNEL_START,
  CLOSE_WYRE_COIN_CHANNEL,
} from "../../../../../utils/constants/storeType";
import WyreProvider from '../../../../../utils/services/WyreProvider';

export const initWyreCoinChannel = async (coinObj) => {
  await WyreProvider.loadWyreCoinAddresses()

  Store.dispatch({
    type: INIT_WYRE_COIN_CHANNEL_START,
    payload: { chainTicker: coinObj.id }
  })

  return
}

export const closeWyreCoinWallet = async (coinObj) => {
  Store.dispatch({
    type: CLOSE_WYRE_COIN_CHANNEL,
    payload: { chainTicker: coinObj.id }
  })

  return
}