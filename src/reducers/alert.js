/*
  The alert reducer handles the alert queue, where app alerts get pushed
  to be shown
*/

import {
  PUSH_ALERT,
  SET_ACTIVE_ALERT,
  SHIFT_ALERTS,
} from "../utils/constants/storeType";

export const alert = (
  state = {
    queue: [],
    active: null,
    result: null,
  },
  action
) => {
  switch (action.type) {
    case PUSH_ALERT:
      return {
        ...state,
        queue: [...state.queue, action.payload.alert],
      };
    case SHIFT_ALERTS:
      return {
        ...state,
        queue: state.queue.slice(1),
      };
    case SET_ACTIVE_ALERT:
      return {
        ...state,
        active: action.payload.activeAlert,
        result: action.payload.result,
      };
    default:
      return state;
  }
};
