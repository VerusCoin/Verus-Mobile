import {
  SET_DEEPLINK_DATA,
    SET_DEEPLINK_URL,
    SET_DEEPLINK_DATA_EXTRAPARAMS
  } from "../utils/constants/storeType";
  
  export const deeplink = (
    state = {
      url: null,
      data: {},
      id: null,
      fromService: null,
      extraParams: null
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
          extraParams: action.payload.extraParams
        }
      case SET_DEEPLINK_DATA_EXTRAPARAMS:
        return {
          ...state,
          extraParams: action.payload.extraParams
        }
      default:
        return state;
    }
  };
  