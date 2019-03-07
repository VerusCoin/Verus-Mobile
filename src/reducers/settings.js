/*
  The settings reducer contains information to do with
  user-decided app settings.
*/

export const settings = (state = {
  btcFeesAdvanced: false,
  extendedCoinInfo: false,
  extendedTxInfo: false,
  pinForTxs: false,
  activeConfigSection: null
}, action) => {
  switch (action.type) {
    case 'SET_CONFIG_SECTION':
      return {
        ...state,
        activeConfigSection: action.activeConfigSection,
      };
    default:
      return state;
  }
}