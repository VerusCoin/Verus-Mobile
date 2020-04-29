/*
  The coin reducer conatains general coin information NOT
  fetched from electrum. This includes data stored in AsyncStorage.
*/

import {
  SET_ACTIVE_COIN,
  SET_ACTIVE_APP,
  SET_ACTIVE_SECTION,
  SET_COIN_LIST,
  SET_USER_COINS,
  SET_COIN_STATUS,
  SET_COINMENU_FOCUS,
  OPEN_DLIGHT_SOCKET,
  CLOSE_DLIGHT_SOCKET,
  START_DLIGHT_SYNC,
  STOP_DLIGHT_SYNC
} from '../utils/constants/storeType'
import {
  PRE_DATA,
} from "../utils/constants/intervalConstants";

export const coins = (state = {
  activeCoinList: [],
  activeCoin: {id: null},
  activeCoinsForUser: [],
  activeApp: null,
  activeSection: null,
  status: {},
  coinMenuFocused: false,
  dlightSockets: {},
  dlightSyncing: {},
}, action) => {
  //TODO: Change coin lists to objects not arrays
  switch (action.type) {
    case SET_ACTIVE_COIN:
      return {
        ...state,
        activeCoin: action.activeCoin,
      };
    case SET_ACTIVE_APP:
      return {
        ...state,
        activeApp: action.activeApp,
      };
    case SET_ACTIVE_SECTION:
      return {
        ...state,
        activeSection: action.activeSection,
      };
    case SET_COINMENU_FOCUS:
      return {
        ...state,
        coinMenuFocused: action.payload.isFocused
      }
    case SET_COIN_LIST:
      return {
        ...state,
        activeCoinList: action.activeCoinList,
      };
    case OPEN_DLIGHT_SOCKET:
      return {
        ...state,
        dlightSockets: {
          ...state.dlightSockets,
          [action.payload.chainTicker]: true
        },
      };
    case CLOSE_DLIGHT_SOCKET:
      return {
        ...state,
        dlightSockets: {
          ...state.dlightSockets,
          [action.payload.chainTicker]: false
        },
      };
    case START_DLIGHT_SYNC:
      return {
        ...state,
        dlightSyncing: {
          ...state.dlightSyncing,
          [action.payload.chainTicker]: true
        },
      };
    case STOP_DLIGHT_SYNC:
      return {
        ...state,
        dlightSyncing: {
          ...state.dlightSyncing,
          [action.payload.chainTicker]: false
        },
      };
    case SET_USER_COINS:
      let status = {}
      action.activeCoinsForUser.map(coinObj => {
        status[coinObj.id] = PRE_DATA
      })

      return {
        ...state,
        activeCoinsForUser: action.activeCoinsForUser,
        status
      };
    case SET_COIN_STATUS:
      return {
        ...state,
        status: {
          ...state.status,
          [action.chainTicker]: action.status
        }
      }
    default:
      return state;
  }
}