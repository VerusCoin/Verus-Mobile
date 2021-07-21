/*
  The personal reducer stores the user's personal profile
*/

import { WYRE_SERVICE_ID } from "../utils/constants/services";
import {
  SIGN_OUT, 
  SET_SERVICE_DATA,
  SET_SERVICE_AUTH
} from "../utils/constants/storeType";

// data:
// {
//   [WYRE_SERVICE_ID]: {
//      account: {}
//      payment_methods: []
//   },
// }

export const services = (
  state = {
    // Auth data is stored seperately from the rest of the services info and is encrypted
    auth: {
      [WYRE_SERVICE_ID]: null
    },
    data: {
      [WYRE_SERVICE_ID]: null
    }
  },
  action
) => {
  switch (action.type) {
    case SET_SERVICE_AUTH:
      return {
        ...state,
        auth: {
          ...state.auth,
          [action.payload.service]: action.payload.data
        }
      }
    case SET_SERVICE_DATA:
      return {
        ...state,
        auth: {
          ...state.auth,
          [action.payload.service]: action.payload.data
        }
      }
    case SIGN_OUT:
      return {
        auth: {}
      }
    default:
      return state;
  }
};
