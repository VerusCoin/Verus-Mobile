import {
  SET_DEEPLINK_DATA,
    SET_DEEPLINK_URL
  } from "../utils/constants/storeType";
  
  export const deeplink = (
    state = {
      url: null,
      data: {},
      id: null,
      fromService: null
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
          fromService: action.payload.fromService || null
        }
      default:
        return state;
    }
  };
  