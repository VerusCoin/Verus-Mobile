/*
  The settings reducer contains information to do with
  user-decided app settings.
*/

export const settings = (state = {
  btcFeesAdvanced: false,
  extendedCoinInfo: false,
  extendedTxInfo: false,
  pinForTxs: false,
  activeConfigSection: null,
  walletSettingsState: {
    maxTxCount: 10,
    utxoVerificationLvl: 2,
    errors: { maxTxCount: false, utxoVerificationLvl: false }
  }
}, action) => {
  switch (action.type) {
    case 'SET_CONFIG_SECTION':
      return {
        ...state,
        activeConfigSection: action.activeConfigSection,
      };
    case 'SET_WALLET_SETTINGS_STATE':
        return {
          ...state,
          walletSettingsState: action.walletSettingsState,
        };
    default:
      return state;
  }
}