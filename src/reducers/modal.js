/*
  The modal reducer handles modals generated within the app,
  showing them one at a time as they are generated. The modal
  stack contains unique modal ids.
*/

import {
  PUSH_MODAL,
  REMOVE_MODAL
} from "../utils/constants/storeType";

export const modal = (
  state = {
    stack: [],
  },
  action
) => {
  switch (action.type) {
    case PUSH_MODAL:
      return {
        ...state,
        stack: [...state.stack, action.payload.modal],
      };
    case REMOVE_MODAL:
      return {
        ...state,
        stack: state.stack.filter(modal => modal !== action.payload.modal),
      };
    default:
      return state;
  }
};
