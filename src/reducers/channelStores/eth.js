/*
  The coin reducer contains eth channel specific information
*/

import {
  INIT_ETH_CHANNEL_FINISH,
  CLOSE_ETH_CHANNEL,
  SIGN_OUT_COMPLETE
} from '../../utils/constants/storeType'

export const channelStore_eth = (state = {
  openChannels: {},
}, action) => {
  switch (action.type) {
    case INIT_ETH_CHANNEL_FINISH:
      return {
        ...state,
        openChannels: {
          ...state.openChannels,
          [action.payload.chainTicker]: true
        },
      }
    case CLOSE_ETH_CHANNEL:
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