/*
  The personal reducer stores data used by services
*/

import {
  SET_SERVICE_ACCOUNT,
  SIGN_OUT,
  SET_SERVICE_LOADING,
  SET_SERVICE_STORED_DATA
} from "../utils/constants/storeType";

export const services = (
  state = {
    accounts: {},
    stored: {},
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
    case SET_SERVICE_STORED_DATA:
      return {
        ...state,
        stored: action.payload.data,
      };
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
