import Store from '../../../../../store/index'
import {
  INIT_ERC20_CHANNEL_START,
  CLOSE_ERC20_CHANNEL,
} from "../../../../../utils/constants/storeType";

export const initErc20Wallet = async (coinObj) => {
  Store.dispatch({
    type: INIT_ERC20_CHANNEL_START,
    payload: { chainTicker: coinObj.id, contractAddress: coinObj.contract_address }
  })

  return
}

export const closeErc20Wallet = async (coinObj) => {
  Store.dispatch({
    type: CLOSE_ERC20_CHANNEL,
    payload: { chainTicker: coinObj.id, contractAddress: coinObj.contract_address }
  })

  return
}