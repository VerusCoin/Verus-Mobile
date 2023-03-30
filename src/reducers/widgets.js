/*
  This reducer handles widgets displayed on the home screen
*/
import {
  ADD_WIDGET_FINISH,
  CLEAR_ACCOUNT_WIDGETS_FINISH,
  REMOVE_WIDGET_FINISH,
  SET_WIDGETS,
} from '../utils/constants/storeType';

export const widgets = (
  state = {
    order: {}, // kv store of widget index as displayed on home screen { [id]: index }
  },
  action,
) => {
  switch (action.type) {
    case ADD_WIDGET_FINISH:
      return {
        ...state,
        order: action.payload.order,
      };
    case REMOVE_WIDGET_FINISH:
      return {
        ...state,
        order: action.payload.order,
      };
    case CLEAR_ACCOUNT_WIDGETS_FINISH:
      return {
        ...state,
        order: action.payload.order,
      };
    case SET_WIDGETS:
      return {
        ...state,
        order: action.payload.order,
      };
    default:
      return state;
  }
};
