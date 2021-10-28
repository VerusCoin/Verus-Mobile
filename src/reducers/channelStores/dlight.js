/*
  The coin reducer contains dlight channel specific information
*/

import {
  OPEN_DLIGHT_SOCKET,
  CLOSE_DLIGHT_SOCKET,
  START_DLIGHT_SYNC,
  STOP_DLIGHT_SYNC,
  INIT_DLIGHT_CHANNEL_FINISH,
  SIGN_OUT_COMPLETE,
  CLOSE_DLIGHT_CHANNEL
} from '../../utils/constants/storeType'

export const channelStore_dlight_private = (state = {
  dlightSockets: {},
  dlightSyncing: {},
  openCoinChannels: {}
}, action) => {
  switch (action.type) {
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
    case INIT_DLIGHT_CHANNEL_FINISH:
      return {
        ...state,
        dlightSockets: {
          ...state.dlightSockets,
          [action.payload.chainTicker]: true
        },
        dlightSyncing: {
          ...state.dlightSyncing,
          [action.payload.chainTicker]: true
        },
        openCoinChannels: {
          ...state.openCoinChannels,
          [action.payload.chainTicker]: true
        }
      }
    case CLOSE_DLIGHT_CHANNEL:
      return {
        ...state,
        openCoinChannels: {
          ...state.openCoinChannels,
          [action.payload.chainTicker]: false
        }
      }
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
    case SIGN_OUT_COMPLETE:
      return {
        ...state,
        dlightSockets: {},
        dlightSyncing: {},
        openCoinChannels: {}
      }
    default:
      return state;
  }
}