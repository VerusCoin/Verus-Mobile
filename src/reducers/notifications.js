/*
  This reducer handles in-app notifications, displayed in the
  notification center.
*/

import {
  ADD_NOTIFICATION_FINISH,
  CLEAR_ACCOUNT_NOTIFICATIONS_FINISH,
  CLEAR_NOTIFICATIONS_FINISH,
  REMOVE_NOTIFICATION_FINISH,
  SET_NOTIFICATIONS,
} from '../utils/constants/storeType';

export const notifications = (
  state = {
    directory: {}, // kv store of notifications such that { [uid]: plain notification json }
    accounts: {}, // map of which notification uids belong to which accounts
  },
  action,
) => {
  switch (action.type) {
    case ADD_NOTIFICATION_FINISH:
      return {
        ...state,
        directory: action.payload.directory,
        accounts: action.payload.accounts
      };
    case REMOVE_NOTIFICATION_FINISH:
      return {
        ...state,
        directory: action.payload.directory,
        accounts: action.payload.accounts
      };
    case CLEAR_NOTIFICATIONS_FINISH:
      return {
        ...state,
        directory: action.payload.directory,
        accounts: action.payload.accounts
      };
    case CLEAR_ACCOUNT_NOTIFICATIONS_FINISH:
      return {
        ...state,
        directory: action.payload.directory,
        accounts: action.payload.accounts
      };
    case SET_NOTIFICATIONS:
      return {
        ...state,
        directory: action.payload.directory,
        accounts: action.payload.accounts
      }
    default:
      return state;
  }
};
