/*
  The settings reducer contains information to do with
  user-decided app settings.
*/

import { MAX_VERIFICATION, DEFAULT_PRIVATE_ADDRS } from '../utils/constants/constants'
import {
  SET_COIN_LIST,
  SET_ALL_SETTINGS,
  SET_CONFIG_SECTION,
  SET_GENERAL_WALLET_SETTINGS_STATE,
  SET_CARD_STACK_PREFERENCES,
  SET_COIN_SETTINGS_STATE,
  SET_BUY_SELL_SETTINGS_STATE
} from '../utils/constants/storeType'
import { DLIGHT_PRIVATE } from '../utils/constants/intervalConstants'
import {
  DEFAULT_SETTINGS,
  normalizeGeneralWalletSettings,
  normalizeSettings,
} from '../utils/settings/settingsDefaults'

export const settings = (state = DEFAULT_SETTINGS, action) => {
  switch (action.type) {
    case SET_COIN_LIST:
      //TODO: Change this when activeCoinList is an object
      let newCoinSettings = {}
      action.activeCoinList.forEach((coinObj) => {
        if (!state.coinSettings.hasOwnProperty(coinObj.id)) {
          newCoinSettings[coinObj.id] = {
            verificationLvl: MAX_VERIFICATION, 
            verificationLock: false,
            channels: coinObj.compatible_channels,
            privateAddrs: coinObj.compatible_channels.includes(DLIGHT_PRIVATE) ? DEFAULT_PRIVATE_ADDRS: 0,
            ...coinObj.coinSettings,
          }
        } else {
          newCoinSettings[coinObj.id] = {
            verificationLvl: MAX_VERIFICATION, 
            verificationLock: false,
            channels: coinObj.compatible_channels,
            privateAddrs: coinObj.compatible_channels.includes(DLIGHT_PRIVATE) ? DEFAULT_PRIVATE_ADDRS: 0,
            ...state.coinSettings[coinObj.id],
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
    case SET_ALL_SETTINGS:
      return normalizeSettings({
        ...state,
        ...action.settings,
      })
    case SET_CONFIG_SECTION:
      return {
        ...state,
        activeConfigSection: action.activeConfigSection,
      };
    case SET_GENERAL_WALLET_SETTINGS_STATE:
      return {
        ...state,
        generalWalletSettings: normalizeGeneralWalletSettings({
          ...action.state,
          // A settings write may finish after a new card choice. Loading uses
          // SET_ALL_SETTINGS; write completions must keep the live choices.
          cardStackPreferencesByAccount:
            state.generalWalletSettings.cardStackPreferencesByAccount,
        })
      }
    case SET_CARD_STACK_PREFERENCES: {
      const {accountHash, coinId, preferences} = action.payload;
      const byAccount =
        state.generalWalletSettings.cardStackPreferencesByAccount || {};
      return {
        ...state,
        generalWalletSettings: {
          ...state.generalWalletSettings,
          cardStackPreferencesByAccount: {
            ...byAccount,
            [accountHash]: {...byAccount[accountHash], [coinId]: preferences},
          },
        },
      };
    }
    case SET_COIN_SETTINGS_STATE:
      return {
        ...state,
        coinSettings: action.coinSettings
      }
    case SET_BUY_SELL_SETTINGS_STATE:
      return {
        ...state,
        wyreSettings: action.wyreSettings
      }
    default:
      return state;
  }
}
