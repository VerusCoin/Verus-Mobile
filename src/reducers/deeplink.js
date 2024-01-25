import {
  SET_DEEPLINK_DATA,
    SET_DEEPLINK_URL,
    SET_DEEPLINK_PASSTHROUGH_DATA
  } from "../utils/constants/storeType";
  
  export const deeplink = (
    state = {
      url: null,
      data: {},
      id: null,
      fromService: null,
      passthrough: null
    },
    action
  ) => {
    switch (action.type) {
      case SET_DEEPLINK_URL:
        return {
          ...state,
          url: action.payload.url
        };
      case SET_DEEPLINK_DATA:
        return {
          ...state,
          id: action.payload.id,
          data: action.payload.data,
          fromService: action.payload.fromService,
          passthrough: action.payload.passthrough
        }
      case SET_DEEPLINK_PASSTHROUGH_DATA:
        return {
          ...state,
          passthrough: action.payload.passthrough
        }
      default:
        return state;
    }
  };
  