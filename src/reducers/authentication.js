/*
  The authentication reducer is to contain sensitive account data
  while the app is loaded. When the user logs out, or the app is
  completely closed, only the non-sensitive data should persist.
*/

import {
  SET_ACCOUNTS,
  UPDATE_ACCOUNT_KEYS,
  SIGN_OUT,
  DISABLE_SELECT_DEFAULT_ACCOUNT,
  BIOMETRIC_AUTH,
  AUTHENTICATE_USER,
  SIGN_IN_USER,
  SET_DLIGHT_ADDRESSES
} from "../utils/constants/storeType";

export const authentication = (
  state = {
    accounts: [],
    activeAccount: {
      id: null,
      accountHash: null,
      seeds: {},
      keys: {},
      paymentMethods: {},
      biometry: false
    },
    signedIn: false,
    selectDefaultAccount: true
  },
  action
) => {
  switch (action.type) {
    case DISABLE_SELECT_DEFAULT_ACCOUNT:
      return {
        ...state,
        selectDefaultAccount: false
      };
    case SET_ACCOUNTS:
      return {
        ...state,
        accounts: action.accounts
      };
    case AUTHENTICATE_USER:
      return {
        ...state,
        activeAccount: action.activeAccount,
      };
    case SIGN_IN_USER:
      return {
        ...state,
        signedIn: true,
        selectDefaultAccount: false
      };
    case UPDATE_ACCOUNT_KEYS:
      return {
        ...state,
        activeAccount: {
          ...state.activeAccount,
          keys: action.keys
        }
      };
    case SET_DLIGHT_ADDRESSES:
      const currentDlightAddrs = state.activeAccount.keys[
        action.payload.chainTicker
      ]
        ? state.activeAccount.keys[action.payload.chainTicker].dlight
        : {};
      return {
        ...state,
        activeAccount: {
          ...state.activeAccount,
          keys: {
            ...state.activeAccount.keys,
            [action.payload.chainTicker]: {
              ...state.activeAccount.keys[action.payload.chainTicker],
              dlight_private: {
                ...currentDlightAddrs,
                addresses: action.payload.addresses
              }
            }
          }
        }
      };
    case SIGN_OUT:
      return {
        ...state,
        activeAccount: null,
        signedIn: false
      };
    case BIOMETRIC_AUTH:
      return {
        ...state,
        activeAccount: { ...state.activeAccount, biometry: action.payload.biometry },
        accounts: action.payload.accounts
      };
    default:
      return state;
  }
};
