/*
  This reduces contains general navigation and saved form data
  for the custom coin adding screens
*/

import {
  SET_ACTIVE_SECTION_CUSTOM_COIN
} from '../utils/constants/storeType'

export const customCoins = (state = {
  activeSection: null
}, action) => {
  switch (action.type) {
    case SET_ACTIVE_SECTION_CUSTOM_COIN:
      return {
        ...state,
        activeSection: action.activeSection,
      };
    default:
      return state;
  }
}