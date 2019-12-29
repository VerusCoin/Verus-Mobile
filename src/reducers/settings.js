/*
  The settings reducer contains information to do with
  user-decided app settings.
*/

import { MAX_VERIFICATION } from '../utils/constants'

export const settings = (state = {
  btcFeesAdvanced: false,
  extendedCoinInfo: false,
  extendedTxInfo: false,
  pinForTxs: false,
  activeConfigSection: null,
  generalWalletSettings: {
    maxTxCount: 10
  },
  buySellSettings: {}, //e.g. {'user1': {buySellEnabled: true, wyreData: {}}, 'user2': {buySellEnabled: false, wyreData: {}}}
  coinSettings: {}, //e.g. {VRSC: {verificationLvl: 2, verificationLock: false}}
}, action) => {
  switch (action.type) {
    case 'SET_COIN_LIST':
      //TODO: Change this when activeCoinList is an object
      let newCoinSettings = {}
      action.activeCoinList.forEach((coinObj) => {
        if (!state.coinSettings.hasOwnProperty(coinObj.id)) {
          newCoinSettings[coinObj.id] = {
            verificationLvl: MAX_VERIFICATION, 
            verificationLock: false,
            ...coinObj.coinSettings,
          }
        }

        if (coinObj.overrideCoinSettings && Object.keys(coinObj.overrideCoinSettings).length > 0) {
          newCoinSettings[coinObj.id] = {
            ...newCoinSettings[coinObj.id],
            ...coinObj.overrideCoinSettings
          }
        }
      })
      return {
        ...state,
        coinSettings: {
          ...state.coinSettings,
          ...newCoinSettings
        },
      };
    case 'SET_ALL_SETTINGS': 
      return {
        ...state,
        ...action.settings
      }
    case 'SET_CONFIG_SECTION':
      return {
        ...state,
        activeConfigSection: action.activeConfigSection,
      };
    case 'SET_GENERAL_WALLET_SETTINGS_STATE':
      return {
        ...state,
        generalWalletSettings: action.state
      }
    case 'SET_COIN_SETTINGS_STATE':
      return {
        ...state,
        coinSettings: action.coinSettings
      }
    case 'SET_BUY_SELL_SETTINGS_STATE':
      return {
        ...state,
        wyreSettings: action.wyreSettings
      }
    default:
      return state;
  }
}