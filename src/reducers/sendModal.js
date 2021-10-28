/*
  The modal reducer handles modals generated within the app,
  showing them one at a time as they are generated. The modal
  stack contains unique modal ids.
*/

import {
  OPEN_SEND_COIN_MODAL,
  CLOSE_SEND_COIN_MODAL,
  SET_SEND_COIN_MODAL_DATA_FIELD,
  SET_SEND_COIN_MODAL_VISIBLE
} from "../utils/constants/storeType";

export const sendModal = (
  state = {
    coinObj: { id: null },
    subWallet: { id: null },
    visible: false,
    title: "",
    type: null,
    data: {},
    helpText: null
  },
  action
) => {
  switch (action.type) {
    case OPEN_SEND_COIN_MODAL:
      return {
        type: action.payload.type,
        data: action.payload.data,
        visible: true,
        title: action.payload.title,
        subWallet: action.payload.subWallet,
        coinObj: action.payload.coinObj,
        helpText: action.payload.helpText
      };
    case CLOSE_SEND_COIN_MODAL:
      return {
        coinObj: { id: null },
        subWallet: { id: null },
        visible: false,
        title: "",
        type: null,
        data: {},
        helpText: null
      };
    case SET_SEND_COIN_MODAL_DATA_FIELD:
      return {
        ...state,
        data: {
          ...state.data,
          [action.payload.key]: action.payload.value
        }
      };
    case SET_SEND_COIN_MODAL_VISIBLE:
      return {
        ...state,
        visible: action.payload.visible
      };
    default:
      return state;
  }
};
