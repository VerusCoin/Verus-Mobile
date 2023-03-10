import {createSelector} from 'reselect';

const selectNotificationDirectory = state => state.notifications.directory;

const selectNotificationAccounts = state => state.notifications.accounts;

export const selectNotifications = createSelector(
  [
    selectNotificationDirectory,
    selectNotificationAccounts,
  ],
  (directory, accounts) => {
    return {
      directory,
      accounts
    };
  },
);
