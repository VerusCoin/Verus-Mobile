/*
  This reducer contains the selected subWallet for a particular coin

  subWallet prototype = {
    channel: String, // The dominant channel of the subwallet for information that multiple channels might provide
    id: String, // A unique identifier for the subwallet
    params: Object // An object of subWallet specific parameters, to be passed to the subWallet components
  }
*/

import {
  DISABLE_CLAIM_BUTTON,
  INIT_COIN_SUB_WALLETS,
  SET_COIN_SUB_WALLET,
  SET_USER_COINS_COMPLETE,
  SIGN_OUT_COMPLETE
} from '../../utils/constants/storeType'

export const coinMenus = (state = {
  activeSubWallets: {},
  allSubWallets: {},
  claimDisabled: false
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
    case SET_USER_COINS_COMPLETE:
      return {
        ...state,
        allSubWallets: action.payload.allSubWallets,
      };
    case DISABLE_CLAIM_BUTTON:
      return {
        ...state,
        claimDisabled: true
      };
    case SIGN_OUT_COMPLETE:
      return {
        ...state,
        claimDisabled: false
      };
    default:
      return state;
  }
}