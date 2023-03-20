import {all, takeEvery, call, put, select} from 'redux-saga/effects';
import {selectWidgets} from '../selectors/widgets';
import {storeWidgetsForAccount} from '../utils/asyncStore/widgetStorage';
import {
  ADD_WIDGET_FINISH,
  REMOVE_WIDGET_FINISH,
  CLEAR_ACCOUNT_WIDGETS_FINISH,
  ADD_WIDGET_START,
  REMOVE_WIDGET_START,
  CLEAR_ACCOUNT_WIDGETS_START,
  SET_WIDGETS,
} from '../utils/constants/storeType';

export default function* widgetsSaga() {
  yield all([takeEvery(ADD_WIDGET_START, handleAddWidget)]);
  yield all([takeEvery(REMOVE_WIDGET_START, handleRemoveWidget)]);
  yield all([
    takeEvery(
      CLEAR_ACCOUNT_WIDGETS_START,
      handleClearAccountWidgets,
    ),
  ]);
  yield all([takeEvery(SET_WIDGETS, handleSetWidgets)]);
}

function* postProcessWidgetAction(acchash) {
  const widgets = yield select(selectWidgets);
  yield call(storeWidgetsForAccount, widgets, acchash);
}

function* handleAddWidget(action) {
  const { order } = yield select(selectWidgets);
  const orderValues = Object.values(order)
  let newWidgetPosition = 0

  if (orderValues.length > 0) {
    newWidgetPosition = Math.max(...orderValues) + 1
  }

  yield call(handleFinishAddWidget, {
    order: {
      ...order,
      [action.payload.id]: newWidgetPosition,
    },
    acchash: action.payload.acchash
  });
}

function* handleFinishAddWidget(payload) {
  yield put({type: ADD_WIDGET_FINISH, payload});
  yield call(postProcessWidgetAction, payload.acchash);
}

function* handleRemoveWidget(action) {
  const { order } = yield select(selectWidgets);
  let newOrder = { ...order }
  const removedPosition = newOrder[action.payload.id]

  delete newOrder[action.payload.id]

  for (const key in newOrder) {
    if (newOrder[key] > removedPosition) newOrder[key] = newOrder[key] - 1
  }

  yield call(handleFinishRemoveWidget, {
    order: newOrder,
    acchash: action.payload.acchash
  });
}

function* handleFinishRemoveWidget(payload) {
  yield put({type: REMOVE_WIDGET_FINISH, payload});
  yield call(postProcessWidgetAction, payload.acchash);
}

function* handleClearAccountWidgets(action) {
  yield call(handleFinishClearAccountWidgets, {
    order: {},
    acchash: action.payload.acchash
  });
}

function* handleFinishClearAccountWidgets(payload) {
  yield put({type: CLEAR_ACCOUNT_WIDGETS_FINISH, payload});
  yield call(postProcessWidgetAction, payload.acchash);
}

function* handleSetWidgets(action) {
  if (action.payload.save) {
    yield call(postProcessWidgetAction, action.payload.acchash);
  }
}