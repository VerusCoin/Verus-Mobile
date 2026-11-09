import {
  CLOSE_VERUSID_CHANNEL,
  SIGN_OUT_COMPLETE,
  SET_WATCHED_VERUSIDS,
  INIT_VERUSID_CHANNEL_FINISH,
  SET_PENDING_VERUSIDS,
  SET_IDENTITY_REGISTRATION_JOBS,
} from '../../utils/constants/storeType'

export const channelStore_verusid = (state = {
  openCoinChannels: {},
  watchedVerusIds: {},
  pendingIds: {},
  registrationJobs: {},
  serviceChannelOpen: true,
}, action) => {
  switch (action.type) {
    case INIT_VERUSID_CHANNEL_FINISH:
      return {
        ...state,
        serviceChannelOpen: true,
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
        watchedVerusIds: {},
        pendingIds: {},
        registrationJobs: {},
        serviceChannelOpen: false,
      }
    case SET_WATCHED_VERUSIDS:
      return {
        ...state,
        watchedVerusIds: action.payload.watchedVerusIds
      }
    case SET_PENDING_VERUSIDS:
      return {
        ...state,
        pendingIds: action.payload.pendingIds
      }
    case SET_IDENTITY_REGISTRATION_JOBS:
      return {
        ...state,
        registrationJobs: action.payload.registrationJobs,
      }
    default:
      return state;
  }
}
