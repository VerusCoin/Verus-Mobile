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
    case SET_USER_COINS_COMPLETE: {
      const allSubWallets = action.payload.allSubWallets;
      const activeSubWallets = {};

      // A rebuild can remove an unlinked identity or refresh a wallet's
      // channels. Never keep using the old object as a payment source.
      for (const chainTicker of Object.keys(state.activeSubWallets)) {
        const wallets = allSubWallets[chainTicker];
        if (!wallets?.length) continue;
        const selected = state.activeSubWallets[chainTicker];
        activeSubWallets[chainTicker] = selected == null
          ? selected
          : wallets.find(wallet => wallet.id === selected.id) ||
            wallets.find(wallet => wallet.id === 'MAIN_WALLET') || wallets[0];
      }

      return {
        ...state,
        activeSubWallets,
        allSubWallets,
      };
    }
    case DISABLE_CLAIM_BUTTON:
      return {
        ...state,
        claimDisabled: true
      };
    case SIGN_OUT_COMPLETE:
      return {
        ...state,
        activeSubWallets: {},
        allSubWallets: {},
        claimDisabled: false
      };
    default:
      return state;
  }
}
