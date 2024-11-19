/*
  The authentication reducer is to contain sensitive account data
  while the app is loaded. When the user logs out, or the app is
  completely closed, only the non-sensitive data should persist.
*/

import { AUTHENTICATE_USER_SEND_MODAL } from "../utils/constants/sendModal";
import {
  SET_ACCOUNTS,
  UPDATE_ACCOUNT_KEYS,
  DISABLE_SELECT_DEFAULT_ACCOUNT,
  BIOMETRIC_AUTH,
  AUTHENTICATE_USER,
  SIGN_IN_USER,
  SET_ADDRESSES,
  SIGN_OUT_COMPLETE,
  SIGN_OUT,
  OPEN_SEND_COIN_MODAL,
  UPDATE_ACCOUNT_DISABLED_SERVICES,
  UPDATE_ACCOUNT_TESTNET_OVERRIDES_COMPLETE,
  UPDATE_SESSION_KEY,
  INIT_INSTANCE_KEY
} from "../utils/constants/storeType";
import {
  SERVICES_DISABLED_DEFAULT
} from "../../env/index";

export const authentication = (
  state = {
    accounts: [],
    sessionKey: null, // The session key should be set every time a user logs in
    instanceKey: null, // The instance key should be set once per app instance and never changed until app restart
    activeAccount: {
      id: null,
      accountHash: null,
      seeds: {},
      keys: {},
      paymentMethods: {},
      biometry: false,
      keyDerivationVersion: 1,
      disabledServices: SERVICES_DISABLED_DEFAULT,
      testnetOverrides: {}
    },
    signedIn: false,
    selectDefaultAccount: true,
    authModalUsed: false
  },
  action
) => {
  switch (action.type) {
    case INIT_INSTANCE_KEY:
      return {
        ...state,
        instanceKey: state.instanceKey == null ? action.payload.instanceKey : state.instanceKey
      };
    case OPEN_SEND_COIN_MODAL:
      return {
        ...state,
        authModalUsed:
          action.payload.type === AUTHENTICATE_USER_SEND_MODAL
            ? true
            : state.authModalUsed,
      };
    case DISABLE_SELECT_DEFAULT_ACCOUNT:
      return {
        ...state,
        selectDefaultAccount: false
      };
    case SET_ACCOUNTS:
      return {
        ...state,
        accounts: action.payload.accounts
      };
    case AUTHENTICATE_USER:
      return {
        ...state,
        activeAccount: action.activeAccount,
        sessionKey: action.sessionKey
      };
    case UPDATE_SESSION_KEY:
      return {
        ...state,
        sessionKey: action.sessionKey
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
    case SET_ADDRESSES:
      const currentAddrs = state.activeAccount.keys[action.payload.chainTicker]
        ? state.activeAccount.keys[action.payload.chainTicker][action.payload.channel]
        : {};

      if (state.activeAccount.keys[action.payload.chainTicker] == null) return state

      return {
        ...state,
        activeAccount: {
          ...state.activeAccount,
          keys: {
            ...state.activeAccount.keys,
            [action.payload.chainTicker]: {
              ...state.activeAccount.keys[action.payload.chainTicker],
              [action.payload.channel]: {
                ...currentAddrs,
                addresses: action.payload.addresses
              }
            }
          }
        }
      };
    case SIGN_OUT_COMPLETE:
      return {
        ...state,
        activeAccount: null,
        sessionKey: null
      };
    case SIGN_OUT:
      return {
        ...state,
        signedIn: false,
      };
    case BIOMETRIC_AUTH:
      return {
        ...state,
        activeAccount: { ...state.activeAccount, biometry: action.payload.biometry },
        accounts: action.payload.accounts
      };
    case UPDATE_ACCOUNT_DISABLED_SERVICES:
      return {
        ...state,
        activeAccount: { ...state.activeAccount, disabledServices: action.payload.disabledServices },
        accounts: action.payload.accounts
      };
    case UPDATE_ACCOUNT_TESTNET_OVERRIDES_COMPLETE:
      return {
        ...state,
        activeAccount: { ...state.activeAccount, testnetOverrides: action.payload.testnetOverrides },
        accounts: action.payload.accounts
      };
    default:
      return state;
  }
};
