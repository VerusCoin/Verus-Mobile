/*
  The coin reducer contains electrum channel specific information
*/

import {
  INIT_ELECTRUM_CHANNEL_FINISH,
  CLOSE_ELECTRUM_CHANNEL,
  SIGN_OUT_COMPLETE
} from '../../utils/constants/storeType'

export const channelStore_electrum = (state = {
  openCoinChannels: {},
}, action) => {
  switch (action.type) {
    case INIT_ELECTRUM_CHANNEL_FINISH:
      return {
        ...state,
        openCoinChannels: {
          ...state.openCoinChannels,
          [action.payload.chainTicker]: true
        },
      }
    case CLOSE_ELECTRUM_CHANNEL:
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