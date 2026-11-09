import {all, takeEvery, call, put, select} from 'redux-saga/effects';
import {selectNotifications} from '../selectors/notifications';
import {storeNotifications} from '../utils/asyncStore/notificationsStorage';
import {
  ADD_NOTIFICATION_FINISH,
  ADD_NOTIFICATION_START,
  REMOVE_NOTIFICATION_START,
  REMOVE_NOTIFICATION_FINISH,
  CLEAR_NOTIFICATIONS_START,
  CLEAR_NOTIFICATIONS_FINISH,
  CLEAR_ACCOUNT_NOTIFICATIONS_FINISH,
  CLEAR_ACCOUNT_NOTIFICATIONS_START,
} from '../utils/constants/storeType';

export default function* notificationSaga() {
  yield all([takeEvery(ADD_NOTIFICATION_START, handleAddNotification)]);
  yield all([takeEvery(REMOVE_NOTIFICATION_START, handleRemoveNotification)]);
  yield all([takeEvery(CLEAR_NOTIFICATIONS_START, handleClearNotifications)]);
  yield all([
    takeEvery(
      CLEAR_ACCOUNT_NOTIFICATIONS_START,
      handleClearAccountNotifications,
    ),
  ]);
}

function* postProcessNotificationAction() {
  const notifications = yield select(selectNotifications);
  yield call(storeNotifications, notifications);
}

function* handleAddNotification(action) {
  const notifications = yield select(selectNotifications);

  const accountSet = new Set(
    notifications.accounts[action.payload.json.acchash],
  );
  accountSet.add(action.payload.json.uid);

  yield call(handleFinishAddNotification, {
    directory: {
      ...notifications.directory,
      [action.payload.json.uid]: action.payload.json,
    },
    accounts: {
      ...notifications.accounts,
      [action.payload.json.acchash]: Array.from(accountSet),
    },
  });
}

function* handleFinishAddNotification(payload) {
  yield put({type: ADD_NOTIFICATION_FINISH, payload});
  yield call(postProcessNotificationAction);
}

function* handleRemoveNotification(action) {
  const notifications = yield select(selectNotifications);

  // Remove uid from directory
  let newDirectory = {...notifications.directory};
  delete newDirectory[action.payload.uid];

  // Remove uid from account sets
  let newAccounts = {...notifications.accounts};

  for (const accountHash in newAccounts) {
    const accountSet = new Set(newAccounts[accountHash]);

    accountSet.delete(action.payload.uid);

    if (accountSet.size == 0) {
      delete newAccounts[accountHash];
    } else {
      newAccounts[accountHash] = Array.from(accountSet);
    }
  }

  yield call(handleFinishRemoveNotification, {
    directory: newDirectory,
    accounts: newAccounts,
  });
}

function* handleFinishRemoveNotification(payload) {
  yield put({type: REMOVE_NOTIFICATION_FINISH, payload});
  yield call(postProcessNotificationAction);
}

function* handleClearNotifications() {
  yield call(handleFinishClearNotifications, {directory: {}, accounts: {}});
}

function* handleFinishClearNotifications(payload) {
  yield put({type: CLEAR_NOTIFICATIONS_FINISH, payload});
  yield call(postProcessNotificationAction);
}

function* handleClearAccountNotifications(action) {
  const acchash = action.payload.acchash;
  if (typeof acchash !== 'string' || !acchash) return;

  const notifications = yield select(selectNotifications);
  const newDirectory = {...notifications.directory};
  const removedUids = new Set();

  // Match the widget's ownership check instead of trusting a stale account index.
  for (const [uid, notification] of Object.entries(newDirectory)) {
    if (notification.acchash === acchash && !notification.persistent) {
      delete newDirectory[uid];
      removedUids.add(uid);
    }
  }

  const newAccounts = {...notifications.accounts};
  for (const accountHash of Object.keys(newAccounts)) {
    const remaining = newAccounts[accountHash].filter(uid => !removedUids.has(uid));
    if (remaining.length) newAccounts[accountHash] = remaining;
    else delete newAccounts[accountHash];
  }

  const retainedUids = Object.keys(newDirectory).filter(uid => newDirectory[uid].acchash === acchash);
  if (retainedUids.length) newAccounts[acchash] = retainedUids;
  else delete newAccounts[acchash];

  yield call(handleFinishClearAccountNotifications, {
    directory: newDirectory,
    accounts: newAccounts,
  });
}

function* handleFinishClearAccountNotifications(payload) {
  yield put({type: CLEAR_ACCOUNT_NOTIFICATIONS_FINISH, payload});
  yield call(postProcessNotificationAction);
}
