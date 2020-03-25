/*
  This reducer contains general navigation and saved form data
  for the buy/sell crypto screen
*/

import {
  SET_ACTIVE_SECTION_BUY_SELL_CRYPTO
} from '../utils/constants/storeType'

export const buySellCrypto = (state = {
  activeSection: null
}, action) => {
  switch (action.type) {
    case SET_ACTIVE_SECTION_BUY_SELL_CRYPTO:
      return {
        ...state,
        activeSection: action.activeSection,
      };
    default:
      return state;
  }
}