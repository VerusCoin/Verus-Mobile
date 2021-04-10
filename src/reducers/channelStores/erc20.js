/*
  The coin reducer contains erc20 channel specific information
*/

import {
  INIT_ERC20_CHANNEL_FINISH,
  CLOSE_ERC20_CHANNEL,
  SIGN_OUT_COMPLETE,
  ADD_WEB3_CONTRACT,
  REMOVE_WEB3_CONTRACT,
  CLEAR_WEB3_CONTRACTS
} from '../../utils/constants/storeType'

export const channelStore_erc20 = (state = {
  openChannels: {},
  web3Contracts: {},
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
    case ADD_WEB3_CONTRACT:
      return {
        ...state,
        web3Contracts: {
          ...state.web3Contracts,
          [action.payload.contract[0]]: action.payload.contract
        },
      }
    case REMOVE_WEB3_CONTRACT:
      return {
        ...state,
        web3Contracts: {
          ...state.web3Contracts,
          [action.payload.contractAddress]: null
        },
      }
    case CLEAR_WEB3_CONTRACTS:
      return {
        ...state,
        web3Contracts: {},
      }
    case CLOSE_ERC20_CHANNEL:
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