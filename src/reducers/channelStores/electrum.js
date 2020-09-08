/*
  The coin reducer contains electrum channel specific information
*/

import {
  INIT_ELECTRUM_CHANNEL_FINISH,
  CLOSE_ELECTRUM_CHANNEL,
  SIGN_OUT
} from '../../utils/constants/storeType'

export const channelStore_electrum = (state = {
  openChannels: {},
}, action) => {
  switch (action.type) {
    case INIT_ELECTRUM_CHANNEL_FINISH:
      return {
        ...state,
        openChannels: {
          ...state.openChannels,
          [action.payload.chainTicker]: true
        },
      }
    case CLOSE_ELECTRUM_CHANNEL:
      return {
        ...state,
        openChannels: {
          ...state.openChannels,
          [action.payload.chainTicker]: false
        },
      }
    case SIGN_OUT:
      return {
        openChannels: {}
      }
    default:
      return state;
  }
}