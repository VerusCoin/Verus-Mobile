/*
  The settings reducer contains information to do with
  user-decided app settings.
*/

import { MAX_VERIFICATION, DEFAULT_PRIVATE_ADDRS, ADDRESS_BLOCKLIST_FROM_WEBSERVER } from '../utils/constants/constants'
import {
  SET_COIN_LIST,
  SET_ALL_SETTINGS,
  SET_CONFIG_SECTION,
  SET_GENERAL_WALLET_SETTINGS_STATE,
  SET_COIN_SETTINGS_STATE,
  SET_BUY_SELL_SETTINGS_STATE
} from '../utils/constants/storeType'
import { DLIGHT_PRIVATE } from '../utils/constants/intervalConstants'
import { USD } from '../utils/constants/currencies'

export const settings = (state = {
  btcFeesAdvanced: false,
  extendedCoinInfo: false,
  extendedTxInfo: false,
  pinForTxs: false,
  activeConfigSection: null,
  generalWalletSettings: {
    maxTxCount: 10,
    displayCurrency: USD,
    defaultAccount: null,
    homeCardDragDetection: false,
    allowSettingVerusPaySlippage: false, 
    ackedCurrencyDisclaimer: false,
    addressBlocklistDefinition: {
      type: ADDRESS_BLOCKLIST_FROM_WEBSERVER,
      data: null
    },
    addressBlocklist: [],
    vrpcOverrides: {} // {[systemId]: [vrpcEndpoint1, vrpcEndpoint2, ...]}
  },
  buySellSettings: {}, //e.g. {user1': {buySellEnabled: true, wyreData: {}}, 'user2: {buySellEnabled: false, wyreData: {}}}
  coinSettings: {}, //e.g. {VRSC: {verificationLvl: 2, verificationLock: false, channels: ['dlight', 'electrum', 'general'], privateAddrs: 100}}
}, action) => {
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
      return {
        ...state,
        ...action.settings
      }
    case SET_CONFIG_SECTION:
      return {
        ...state,
        activeConfigSection: action.activeConfigSection,
      };
    case SET_GENERAL_WALLET_SETTINGS_STATE:
      return {
        ...state,
        generalWalletSettings: action.state
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