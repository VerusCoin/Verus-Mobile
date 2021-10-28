/*
  The coin reducer contains eth channel specific information
*/

import {
  INIT_ETH_CHANNEL_FINISH,
  CLOSE_ETH_CHANNEL,
  SIGN_OUT_COMPLETE
} from '../../utils/constants/storeType'

export const channelStore_eth = (state = {
  openCoinChannels: {},
}, action) => {
  switch (action.type) {
    case INIT_ETH_CHANNEL_FINISH:
      return {
        ...state,
        openCoinChannels: {
          ...state.openCoinChannels,
          [action.payload.chainTicker]: true
        },
      }
    case CLOSE_ETH_CHANNEL:
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