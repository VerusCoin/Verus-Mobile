/*
  The NFC tap screen for a card read that is not tied to one screen, such as
  "Claim from NFC card". Closing keeps the last step so the screen can fade out.
*/

import {CLOSE_NFC_TAP, SET_NFC_TAP} from '../utils/constants/storeType';

const initialState = {
  visible: false,
  phase: null,
  title: null,
  detail: null,
  actions: [],
};

export const nfcTap = (state = initialState, action) => {
  switch (action.type) {
    case SET_NFC_TAP:
      return {
        ...initialState,
        ...action.payload,
        visible: true,
      };
    case CLOSE_NFC_TAP:
      return {
        ...state,
        visible: false,
      };
    default:
      return state;
  }
};
