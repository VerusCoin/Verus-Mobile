export const authentication = (state = {
  accounts: [],
  activeAccount: {id: null, wifKey: "", keys: []},
  unlocked: false,
  fingerPrint: false,
  signedIn: false
}, action) => {
  switch (action.type) {
    case 'ADD_ACCOUNT':
      return {
        ...state,
        accounts: action.newAccounts,
      };
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
        activeAccount: {id: state.activeAccount.id, wifKey: state.activeAccount.wifKey, keys: action.keys},
      };
    case 'SIGN_OUT':
      return {
        ...state,
        activeAccount: null,
        signedIn: false
      };
    case 'SET_LOCK':
      return {
        ...state,
        locked: action.locked,
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