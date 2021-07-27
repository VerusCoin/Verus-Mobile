/*
  The personal reducer stores data used by services
*/

import {
  SET_SERVICE_ACCOUNT,
  SIGN_OUT
} from "../utils/constants/storeType";

export const services = (
  state = {
    accounts: {}
  },
  action
) => {
  switch (action.type) {
    case SET_SERVICE_ACCOUNT:
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [action.payload.channel]: action.payload.body
        }
      }
    case SIGN_OUT:
      return {
        accounts: {}
      }
    default:
      return state;
  }
};
