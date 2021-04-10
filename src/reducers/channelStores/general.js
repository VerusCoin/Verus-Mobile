/*
  The coin reducer contains general channel specific information
*/

import {
  INIT_GENERAL_CHANNEL_FINISH,
  CLOSE_GENERAL_CHANNEL,
  SIGN_OUT_COMPLETE
} from '../../utils/constants/storeType'

export const channelStore_general = (state = {
  openChannels: {},
}, action) => {
  switch (action.type) {
    case INIT_GENERAL_CHANNEL_FINISH:
      return {
        ...state,
        openChannels: {
          ...state.openChannels,
          [action.payload.chainTicker]: true
        },
      }
    case CLOSE_GENERAL_CHANNEL:
      return {
        ...state,
        openChannels: {
          ...state.openChannels,
          [action.payload.chainTicker]: false
        },
      }
    case SIGN_OUT_COMPLETE:
      return {
        openChannels: {}
      }
    default:
      return state;
  }
}