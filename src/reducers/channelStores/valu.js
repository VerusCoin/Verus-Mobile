/*
  The coin reducer contains general channel specific information
*/

import {
    INIT_VALU_COIN_CHANNEL_FINISH,
    CLOSE_VALU_COIN_CHANNEL,
    SIGN_OUT_COMPLETE,
    OPEN_VALU_SERVICE_CHANNEL,
    CLOSE_VALU_SERVICE_CHANNEL,
    AUTHENTICATE_VALU_SERVICE,
    DEAUTHENTICATE_VALU_SERVICE,
    SET_VALU_ACCOUNT_ID,
    SET_CURRENT_VALU_ACCOUNT_DATA,
    SET_VALU_ACCOUNT_STAGE,
    SET_VALU_AMOUNT_FUNDED
  } from '../../utils/constants/storeType'

  export const channelStore_valu_service = (state = {
    openCoinChannels: {},
    serviceChannelOpen: true,
    authenticated: false,
    accountId: null,
    KYCState: 0,
    accountLogin: null,
    currentAccountDataScreenParams: null,
    amountFunded: 0
  }, action) => {
    switch (action.type) {
      case INIT_VALU_COIN_CHANNEL_FINISH:
        return {
          ...state,
          openCoinChannels: {
            ...state.openCoinChannels,
            [action.payload.chainTicker]: true
          },
        }
      case CLOSE_VALU_COIN_CHANNEL:
        return {
          ...state,
          openCoinChannels: {
            ...state.openCoinChannels,
            [action.payload.chainTicker]: false
          },
        }
      case OPEN_VALU_SERVICE_CHANNEL:
        return {
          ...state,
          serviceChannelOpen: true
        }
      case CLOSE_VALU_SERVICE_CHANNEL:
        return {
          ...state,
          serviceChannelOpen: false
        }
      case AUTHENTICATE_VALU_SERVICE:
        return {
          ...state,
          authenticated: true,
          accountId: action.payload.accountId,
          KYCState: action.payload.KYCState,
          email: action.payload.email
        }
      case DEAUTHENTICATE_VALU_SERVICE:
        return {
          ...state,
          authenticated: false,
          accountId: null
        }
      case SET_VALU_ACCOUNT_ID:
        return {
          ...state,
          accountId: action.payload.accountId,
          KYCState: action.payload.KYCState
        }
      case SET_VALU_ACCOUNT_STAGE:
        return {
          ...state,
          KYCState: action.payload.KYCState
        }
      case SIGN_OUT_COMPLETE:
        return {
          ...state,
          openCoinChannels: {},
          serviceChannelOpen: true,
          authenticated: false,
          accountId: null,
          currentAccountDataScreenParams: null
        }
      case SET_CURRENT_VALU_ACCOUNT_DATA:
        return {
          ...state,
          currentAccountDataScreenParams: action.payload.accountData
        }
      case SET_VALU_AMOUNT_FUNDED:
        return {
          ...state,
          amountFunded: action.payload.amountFunded
        }
      default:
        return state;
    }
  }