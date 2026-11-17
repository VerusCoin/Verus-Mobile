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

const reconcileActiveSubWallets = (activeSubWallets, allSubWallets) => {
  const nextActiveSubWallets = {};
  const subWalletsByChain = allSubWallets || {};

  for (const chainTicker of Object.keys(activeSubWallets)) {
    const selectedSubWallet = activeSubWallets[chainTicker];

    if (selectedSubWallet == null) {
      nextActiveSubWallets[chainTicker] = selectedSubWallet;
      continue;
    }

    const matchingSubWallet = (subWalletsByChain[chainTicker] || []).find(
      subWallet => subWallet.id === selectedSubWallet.id,
    );

    nextActiveSubWallets[chainTicker] = matchingSubWallet || null;
  }

  return nextActiveSubWallets;
};

export const coinMenus = (state = {
  activeSubWallets: {},
  userSelectedSubWallets: {},
  allSubWallets: {},
  claimDisabled: false
}, action) => {
  switch (action.type) {
    case SET_COIN_SUB_WALLET:
      return {
        ...state,
        activeSubWallets: {...state.activeSubWallets, [action.payload.chainTicker]: action.payload.subWallet},
        // Automatic opening/default choices must not become user preferences.
        userSelectedSubWallets: action.payload.userSelected
          ? {...state.userSelectedSubWallets, [action.payload.chainTicker]: action.payload.subWallet}
          : state.userSelectedSubWallets,
      };
    case SET_USER_COINS_COMPLETE:
      return {
        ...state,
        allSubWallets: action.payload.allSubWallets || {},
        userSelectedSubWallets: reconcileActiveSubWallets(
          state.userSelectedSubWallets || {},
          action.payload.allSubWallets,
        ),
        activeSubWallets: reconcileActiveSubWallets(
          state.activeSubWallets,
          action.payload.allSubWallets,
        ),
      };
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
        userSelectedSubWallets: {},
        claimDisabled: false
      };
    default:
      return state;
  }
}
