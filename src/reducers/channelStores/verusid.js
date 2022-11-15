import {
  CLOSE_VERUSID_CHANNEL,
  SIGN_OUT_COMPLETE,
  SET_WATCHED_VERUSIDS,
  INIT_VERUSID_CHANNEL_FINISH
} from '../../utils/constants/storeType'

export const channelStore_verusid = (state = {
  openCoinChannels: {},
  watchedVerusIds: {}
}, action) => {
  switch (action.type) {
    case INIT_VERUSID_CHANNEL_FINISH:
      return {
        ...state,
        openCoinChannels: {
          ...state.openCoinChannels,
          [action.payload.chainTicker]: true
        },
      }
    case CLOSE_VERUSID_CHANNEL:
      return {
        ...state,
        openCoinChannels: {
          ...state.openCoinChannels,
          [action.payload.chainTicker]: false
        },
      }
    case SIGN_OUT_COMPLETE:
      return {
        openCoinChannels: {},
        watchedVerusIds: {}
      }
    case SET_WATCHED_VERUSIDS:
      return {
        ...state,
        watchedVerusIds: action.payload.watchedVerusIds
      }
    default:
      return state;
  }
}