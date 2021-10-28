/*
  The keyboard reducer stores information about the phone keyboard
  for display purposes
*/

import {
  SET_KEYBOARD_ACTIVE,
  SET_KEYBOARD_HEIGHT
} from "../utils/constants/storeType";

export const keyboard = (
  state = {
    height: 0,
    active: false
  },
  action
) => {
  switch (action.type) {
    case SET_KEYBOARD_HEIGHT:
      return {
        ...state,
        height: action.payload.height
      };
    case SET_KEYBOARD_ACTIVE:
      return {
        ...state,
        active: action.payload.active
      }
    default:
      return state;
  }
};
