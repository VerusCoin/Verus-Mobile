/*
  The authentication reducer is to contain sensitive account data
  while the app is loaded. When the user logs out, or the app is
  completely closed, only the non-sensitive data should persist.
*/

export const authentication = (state = {
  accounts: [],
  activeAccount: {id: null, wifKey: "", keys: [], paymentMethods: {}},
  unlocked: false,
  fingerPrint: false,
  signedIn: false
}, action) => {
  switch (action.type) {
    case 'SET_ACCOUNTS':
      return {
        ...state,
        accounts: action.accounts,
      };
    case 'SIGN_IN':
      return {
        ...state,
        activeAccount: action.activeAccount,
        signedIn: true
      };
    case 'UPDATE_ACCOUNT_KEYS':
      return {
        ...state,
        activeAccount: {
          ...state.activeAccount,
          keys: action.keys
        },
      };
    case 'SIGN_OUT':
      return {
        ...state,
        activeAccount: null,
        signedIn: false
      };
    case 'FINGER_AUTH':
      return {
        ...state,
        fingerPrint: action.fingerPrint,
      };
    default:
      return state;
  }
}
