/*
  The coin reducer contains erc20 channel specific information
*/

import {
  INIT_ERC20_CHANNEL_FINISH,
  CLOSE_ERC20_CHANNEL,
  SIGN_OUT
} from '../../utils/constants/storeType'

export const channelStore_erc20 = (state = {
  openChannels: {},
}, action) => {
  switch (action.type) {
    case INIT_ERC20_CHANNEL_FINISH:
      return {
        ...state,
        openChannels: {
          ...state.openChannels,
          [action.payload.chainTicker]: true
        },
      }
    case CLOSE_ERC20_CHANNEL:
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