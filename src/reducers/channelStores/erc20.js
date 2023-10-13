/*
  The coin reducer contains erc20 channel specific information
*/

import {
  INIT_ERC20_CHANNEL_FINISH,
  CLOSE_ERC20_CHANNEL,
  SIGN_OUT_COMPLETE
} from '../../utils/constants/storeType'

export const channelStore_erc20 = (state = {
  openCoinChannels: {},
  web3Contracts: {},
}, action) => {
  switch (action.type) {
    case INIT_ERC20_CHANNEL_FINISH:
      return {
        ...state,
        openCoinChannels: {
          ...state.openCoinChannels,
          [action.payload.chainTicker]: true
        },
      }
    case CLOSE_ERC20_CHANNEL:
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