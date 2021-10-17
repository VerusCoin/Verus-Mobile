import {
  SET_SECURE_LOADING_ERROR_DATA,
  SET_SECURE_LOADING_SUCCESS_DATA,
  CLEAR_SECURE_LOADING_DATA
} from "../utils/constants/storeType";

export const secureLoading = (
  state = {
    successData: {},
    errorData: {}
  },
  action
) => {
  switch (action.type) {
    case SET_SECURE_LOADING_SUCCESS_DATA:
      return {
        ...state,
        successData: action.payload.data
      };
    case SET_SECURE_LOADING_ERROR_DATA:
      return {
        ...state,
        errorData: action.payload.data
      };
    case CLEAR_SECURE_LOADING_DATA:
      return {
        successData: {},
        errorData: {}
      };
    default:
      return state;
  }
};
