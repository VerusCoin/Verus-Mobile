/*
  The coin reducer contains general channel specific information
*/

import {
  INIT_WYRE_COIN_CHANNEL_FINISH,
  CLOSE_WYRE_COIN_CHANNEL,
  SIGN_OUT_COMPLETE,
  OPEN_WYRE_SERVICE_CHANNEL,
  CLOSE_WYRE_SERVICE_CHANNEL,
  AUTHENTICATE_WYRE_SERVICE,
  DEAUTHENTICATE_WYRE_SERVICE,
  SET_WYRE_ACCOUNT_ID,
  SET_CURRENT_WYRE_ACCOUNT_DATA
} from '../../utils/constants/storeType'

export const channelStore_wyre_service = (state = {
  openCoinChannels: {},
  serviceChannelOpen: true,
  authenticated: false,
  accountId: null,
  currentAccountDataScreenParams: null
}, action) => {
  switch (action.type) {
    case INIT_WYRE_COIN_CHANNEL_FINISH:
      return {
        ...state,
        openCoinChannels: {
          ...state.openCoinChannels,
          [action.payload.chainTicker]: true
        },
      }
    case CLOSE_WYRE_COIN_CHANNEL:
      return {
        ...state,
        openCoinChannels: {
          ...state.openCoinChannels,
          [action.payload.chainTicker]: false
        },
      }
    case OPEN_WYRE_SERVICE_CHANNEL:
      return {
        ...state,
        serviceChannelOpen: true
      }
    case CLOSE_WYRE_SERVICE_CHANNEL:
      return {
        ...state,
        serviceChannelOpen: false
      }
    case AUTHENTICATE_WYRE_SERVICE:
      return {
        ...state,
        authenticated: true,
        accountId: action.payload.accountId
      }
    case DEAUTHENTICATE_WYRE_SERVICE:
      return {
        ...state,
        authenticated: false,
        accountId: null
      }
    case SET_WYRE_ACCOUNT_ID:
      return {
        ...state,
        accountId: action.payload.accountId
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
    case SET_CURRENT_WYRE_ACCOUNT_DATA:
      return {
        ...state,
        currentAccountDataScreenParams: action.payload.accountData
      }
    default:
      return state;
  }
}