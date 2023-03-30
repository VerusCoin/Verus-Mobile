/*
  The loading modal prevents the user from performing actions 
  while something is loading in the background
*/

import {
  OPEN_LOADING_MODAL,
  CLOSE_LOADING_MODAL
} from "../utils/constants/storeType";

export const loadingModal = (
  state = {
    visible: false,
    message: "",
    height: 442
  },
  action
) => {
  switch (action.type) {
    case OPEN_LOADING_MODAL:
      return {
        ...state,
        visible: true,
        message: action.payload.message,
        height: action.payload.height
      };
    case CLOSE_LOADING_MODAL:
      return {
        ...state,
        visible: false,
        message: "",
        height: 442
      };
    default:
      return state;
  }
};
