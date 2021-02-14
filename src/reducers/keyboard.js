/*
  The keyboard reducer stores information about the phone keyboard
  for display purposes
*/

import {
  SET_KEYBOARD_HEIGHT
} from "../utils/constants/storeType";

export const keyboard = (
  state = {
    height: 0
  },
  action
) => {
  switch (action.type) {
    case SET_KEYBOARD_HEIGHT:
      return {
        ...state,
        height: action.payload.height
      };
    default:
      return state;
  }
};
