/*
  This reducer contains the selected subWallet for a particular coin

  subWallet prototype = {
    channel: String, // The dominant channel of the subwallet for information that multiple channels might provide
    id: String, // A unique identifier for the subwallet
    params: Object // An object of subWallet specific parameters, to be passed to the subWallet components
  }
*/

import {
  INIT_COIN_SUB_WALLETS,
  SET_COIN_SUB_WALLET,
  SET_USER_COINS
} from '../../utils/constants/storeType'
import { getDefaultSubWallets } from '../../utils/defaultSubWallets';

export const coinMenus = (state = {
  activeSubWallets: {},
  allSubWallets: {}
}, action) => {
  switch (action.type) {
    case SET_COIN_SUB_WALLET:
      return {
        ...state,
        activeSubWallets: {...state.activeSubWallets, [action.payload.chainTicker]: action.payload.subWallet},
      };
    case INIT_COIN_SUB_WALLETS:
      return {
        ...state,
        allSubWallets: {...state.allSubWallets, [action.payload.chainTicker]: action.payload.subWallets},
      };
    case SET_USER_COINS:
      let subWallets = {}
      action.activeCoinsForUser.map(coinObj => {
        subWallets[coinObj.id] = getDefaultSubWallets(coinObj)
      })

      return {
        ...state,
        allSubWallets: subWallets
      };
    default:
      return state;
  }
}