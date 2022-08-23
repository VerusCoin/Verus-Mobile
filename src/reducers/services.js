/*
  The personal reducer stores data used by services
*/

import {
  SET_SERVICE_ACCOUNT,
  SIGN_OUT,
  SET_SERVICE_LOADING,
  SET_SERVICE_STORED_DATA,
  SET_SERVICE_PAYMENT_METHODS,
  SET_SERVICE_TRANSFERS,
  SET_SERVICE_RATES
} from "../utils/constants/storeType";

export const services = (
  state = {
    accounts: {},
    paymentMethods: {},
    stored: {}, // { [WYRE_SERVICE_ID]: { wyre document references }, [VERUSID_SERVICE_ID]: { linked_ids: { [key: iAddress]: friendlyName } }}
    transfers: {},
    rates: {},
    loading: false,
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
        loading: action.payload.loading,
      };
    case SIGN_OUT:
      return {
        ...state,
        accounts: {},
        paymentMethods: {},
        stored: {},
        transfers: {},
        rates: {},
        loading: false,
      };
    default:
      return state;
  }
};
