import {
  SET_DEEPLINK_DATA,
  SET_DEEPLINK_URL,
  SET_DEEPLINK_PASSTHROUGH_DATA,
  SIGN_OUT,
} from '../utils/constants/storeType';

const initialState = {
  url: null,
  data: {},
  id: null,
  fromService: null,
  passthrough: null,
  requestId: 0,
  parsingUrl: false,
};

export const deeplink = (state = initialState, action) => {
  switch (action.type) {
    case SIGN_OUT:
      return {...initialState, requestId: state.requestId + 1};
    case SET_DEEPLINK_URL:
      // Do not open a new URL using the previous request's still-present data.
      return {...state, url: action.payload.url, parsingUrl: action.payload.url != null};
    case SET_DEEPLINK_DATA:
      // A closing screen may clear only the request it originally opened.
      if (action.payload.expectedRequestId != null && action.payload.expectedRequestId !== state.requestId) {
        return state;
      }
      if (action.payload.id == null) {
        return {...initialState, requestId: state.requestId + 1};
      }
      return {
        ...state,
        id: action.payload.id,
        data: action.payload.data,
        fromService: action.payload.fromService,
        passthrough: action.payload.passthrough,
        requestId: state.requestId + 1,
        parsingUrl: false,
      };
    case SET_DEEPLINK_PASSTHROUGH_DATA:
      return {...state, passthrough: action.payload.passthrough};
    default:
      return state;
  }
};
