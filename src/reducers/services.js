/*
  The personal reducer stores data used by services
*/

import { VERUSID_SERVICE_ID, WYRE_SERVICE_ID, PBAAS_PRECONVERT_SERVICE_ID, ATTESTATION_SERVICE_ID } from "../utils/constants/services";
import {
  SET_SERVICE_ACCOUNT,
  SIGN_OUT,
  SET_SERVICE_LOADING,
  SET_SERVICE_STORED_DATA,
  SET_SERVICE_PAYMENT_METHODS,
  SET_SERVICE_TRANSFERS,
  SET_SERVICE_RATES,
  SET_SERVICE_NOTIFICATIONS
} from "../utils/constants/storeType";

export const services = (
  state = {
    accounts: {},
    paymentMethods: {},
    stored: {},
    transfers: {},
    rates: {},
    loading: {
      [WYRE_SERVICE_ID]: false,
      [VERUSID_SERVICE_ID]: false,
      [PBAAS_PRECONVERT_SERVICE_ID]: false,
      [ATTESTATION_SERVICE_ID]: false
    },
  },
  action,
) => {
  switch (action.type) {
    case SET_SERVICE_ACCOUNT:
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [action.payload.channel]: action.payload.body,
        },
      };
    case SET_SERVICE_NOTIFICATIONS:
      return {
        ...state,
        accounts: {
          ...state.accounts,
          [action.payload.channel]: action.payload.body,
        },
      };
    case SET_SERVICE_PAYMENT_METHODS:
      return {
        ...state,
        paymentMethods: {
          ...state.paymentMethods,
          [action.payload.channel]: action.payload.body,
        },
      };
    case SET_SERVICE_TRANSFERS:
      return {
        ...state,
        transfers: {
          ...state.transfers,
          [action.payload.channel]: action.payload.body,
        },
      };
    case SET_SERVICE_RATES:
      return {
        ...state,
        rates: {
          ...state.rates,
          [action.payload.channel]: action.payload.body,
        },
      };
    case SET_SERVICE_STORED_DATA:
      return {
        ...state,
        stored: action.payload.data,
      };
    case SET_SERVICE_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.service]: action.payload.loading,
        },
      };
    case SIGN_OUT:
      return {
        ...state,
        accounts: {},
        paymentMethods: {},
        stored: {},
        transfers: {},
        rates: {},
        loading: {
          [WYRE_SERVICE_ID]: false,
          [VERUSID_SERVICE_ID]: false,
          [PBAAS_PRECONVERT_SERVICE_ID]: false,
          [ATTESTATION_SERVICE_ID]: false
        },
      };
    default:
      return state;
  }
};
