/*
  The coin reducer contains dlight channel specific information
*/

import {
  OPEN_DLIGHT_SOCKET,
  CLOSE_DLIGHT_SOCKET,
  START_DLIGHT_SYNC,
  STOP_DLIGHT_SYNC,
  INIT_DLIGHT_CHANNEL_FINISH,
  SIGN_OUT,
  CLOSE_DLIGHT_CHANNEL
} from '../../utils/constants/storeType'

export const channelStore_dlight = (state = {
  dlightSockets: {},
  dlightSyncing: {},
  openChannels: {}
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
        openChannels: {
          ...state.openChannels,
          [action.payload.chainTicker]: true
        }
      }
    case CLOSE_DLIGHT_CHANNEL:
      return {
        ...state,
        openChannels: {
          ...state.openChannels,
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
    case SIGN_OUT:
      return {
        ...state,
        dlightSockets: {},
        dlightSyncing: {},
        openChannels: {}
      }
    default:
      return state;
  }
}