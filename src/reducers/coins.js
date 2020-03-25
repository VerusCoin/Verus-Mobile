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
  SET_COIN_STATUS
} from '../utils/constants/storeType'
import {
  DLIGHT,
  PRE_DATA,
  POST_SYNC
} from "../utils/constants/intervalConstants";

export const coins = (state = {
  activeCoinList: [],
  activeCoin: {id: null},
  activeCoinsForUser: [],
  activeApp: null,
  activeSection: null,
  status: {}
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
    case SET_COIN_LIST:
      return {
        ...state,
        activeCoinList: action.activeCoinList,
      };
    case SET_USER_COINS:
      let status = {}
      action.activeCoinsForUser.map(coinObj => {
        status[coinObj.id] = coinObj.compatible_channnels.includes(DLIGHT) ? PRE_DATA : POST_SYNC
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