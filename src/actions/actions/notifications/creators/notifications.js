import { loadNotifications } from '../../../../utils/asyncStore/notificationsStorage';
import {
  ADD_NOTIFICATION_START,
  REMOVE_NOTIFICATION_START,
  CLEAR_NOTIFICATIONS_START,
  CLEAR_ACCOUNT_NOTIFICATIONS_START,
  SET_NOTIFICATIONS,
} from '../../../../utils/constants/storeType';

export const addNotification = (notification) => {
  return {
    type: ADD_NOTIFICATION_START,
    payload: { json: notification }
  }
}

export const removeNotification = (uid) => {
  return {
    type: REMOVE_NOTIFICATION_START,
    payload: { uid }
  }
}

export const clearNotifications = () => {
  return {
    type: CLEAR_NOTIFICATIONS_START
  }
}

export const clearAccountNotifications = (acchash) => {
  return {
    type: CLEAR_ACCOUNT_NOTIFICATIONS_START,
    payload: { acchash }
  }
}

export const setNotifications = (directory, accounts) => {
  return {
    type: SET_NOTIFICATIONS,
    payload: {
      directory,
      accounts
    }
  }
}

export const initNotifications = async () => {
  const notifications = await loadNotifications();

  return setNotifications(
    notifications.directory ? notifications.directory : {},
    notifications.accounts ? notifications.accounts : {},
  );
};
