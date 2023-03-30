import { loadWidgetsForAccount } from '../../../../utils/asyncStore/widgetStorage';
import {
  ADD_WIDGET_START,
  REMOVE_WIDGET_START,
  CLEAR_ACCOUNT_WIDGETS_START,
  SET_WIDGETS,
} from '../../../../utils/constants/storeType';

export const addWidget = (id, acchash) => {
  return {
    type: ADD_WIDGET_START,
    payload: { id, acchash }
  }
}

export const removeWidget = (id, acchash) => {
  return {
    type: REMOVE_WIDGET_START,
    payload: { id, acchash }
  }
}

export const clearAccountWidgets = (acchash) => {
  return {
    type: CLEAR_ACCOUNT_WIDGETS_START,
    payload: { acchash }
  }
}

export const setWidgets = (order, save, acchash) => {
  return {
    type: SET_WIDGETS,
    payload: {
      order,
      save,
      acchash
    }
  }
}

export const initAccountWidgets = async (acchash) => {
  const widgets = await loadWidgetsForAccount(acchash);

  return setWidgets(
    widgets.order ? widgets.order : {}
  );
};

export const setAndSaveAccountWidgets = (order, acchash) => {
  return setWidgets(order, true, acchash)
}