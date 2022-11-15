/*
  The coin reducer conatains general coin information NOT
  fetched from electrum. This includes data stored in AsyncStorage.
*/

import {
  SET_ACTIVE_COIN,
  SET_ACTIVE_APP,
  SET_ACTIVE_SECTION,
  SET_COIN_LIST,
  SET_COIN_STATUS,
  SET_COINMENU_FOCUS,
  SET_USER_COINS_COMPLETE,
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
    case SET_USER_COINS_COMPLETE:
      return {
        ...state,
        activeCoinsForUser: action.payload.activeCoinsForUser,
        status: action.payload.status
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