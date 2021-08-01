/*
  The personal reducer stores data used by services
*/

import {
  SET_SERVICE_ACCOUNT,
  SIGN_OUT,
  SET_SERVICE_LOADING
} from "../utils/constants/storeType";

export const services = (
  state = {
    accounts: {},
    loading: false
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
    case SET_SERVICE_LOADING:
      return {
        ...state,
        loading: action.payload.loading
      }
    case SIGN_OUT:
      return {
        ...state,
        accounts: {},
        loading: false
      }
    default:
      return state;
  }
};
