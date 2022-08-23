/*
  The coin reducer contains erc20 channel specific information
*/

import {
  INIT_VRPC_CHANNEL_FINISH,
  CLOSE_VRPC_CHANNEL,
  SIGN_OUT_COMPLETE,
  ADD_VRPC_ENDPOINT,
  REMOVE_VRPC_ENDPOINT,
  CLEAR_VRPC_ENDPOINTS
} from '../../utils/constants/storeType'

export const channelStore_vrpc = (state = {
  openCoinChannels: {},
  vrpcEndpoints: {},
}, action) => {
  switch (action.type) {
    case INIT_VRPC_CHANNEL_FINISH:
      return {
        ...state,
        openCoinChannels: {
          ...state.openCoinChannels,
          [action.payload.chainTicker]: true
        },
      }
    case ADD_VRPC_ENDPOINT:
      return {
        ...state,
        vrpcEndpoints: {
          ...state.vrpcEndpoints,
          [action.payload.endpointId]: action.payload.endpoint
        },
      }
    case REMOVE_VRPC_ENDPOINT:
      return {
        ...state,
        vrpcEndpoints: {
          ...state.vrpcEndpoints,
          [action.payload.endpointId]: null
        },
      }
    case CLEAR_VRPC_ENDPOINTS:
      return {
        ...state,
        vrpcEndpoints: {},
      }
    case CLOSE_VRPC_CHANNEL:
      return {
        ...state,
        openCoinChannels: {
          ...state.openCoinChannels,
          [action.payload.chainTicker]: false
        },
      }
    case SIGN_OUT_COMPLETE:
      return {
        openCoinChannels: {}
      }
    default:
      return state;
  }
}