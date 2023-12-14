export * from './actions/coins/Coins'
export * from './actions/UserData'
export * from './actions/WalletSettings'
export * from './actions/cache/Electrum'
export * from './actions/cache/Headers'
export * from './actions/cache/Cache'
export * from './actions/cache/EthTransactionReceipts'
export * from './actions/updateManager'
export * from './actions/personal/creators/personal'
export * from './actions/services/creators/services'
export * from './actions/deeplink/creators/deeplink'
export * from './actions/notifications/creators/notifications'
export * from './actions/widgets/creators/widgets'

export * from './actionCreators/claims';
export * from './actionCreators/claimCategories';
export * from './actionCreators/attestations';
export * from './actionCreators/identities';

import {
  SET_ACCOUNTS,
  SIGN_OUT,
  BIOMETRIC_AUTH,
  SET_ACTIVE_COIN,
  SET_CONFIG_SECTION,
  SET_ALL_SETTINGS,
  SET_COIN_SETTINGS_STATE,
  SET_BUY_SELL_SETTINGS_STATE,
  SET_GENERAL_WALLET_SETTINGS_STATE,
  SET_ACTIVE_APP,
  SET_ACTIVE_SECTION,
  SET_COIN_LIST,
  SET_USER_COINS,
  SET_BALANCES,
  SET_BALANCE_SHOW,
  SET_ONE_BALANCE,
  SET_TRANSACTIONS,
  //SET_INTERVAL_ID,
  UPDATE_ACCOUNT_KEYS,
  SET_RATES,
  SET_OVERVIEW_FILTER,
  ADD_SERVER_VERSION,
  SET_SERVER_VERSIONS,
  ADD_HEADER,
  SET_HEADERS,
  CLEAR_CACHE,
  SET_ACTIVE_SECTION_CUSTOM_COIN,
  SET_ACTIVE_SECTION_BUY_SELL_CRYPTO,
  CREATE_WYRE_ACCOUNT,
  CREATE_WYRE_ACCOUNT_RESPONSE,
  GET_WYRE_ACCOUNT,
  GET_WYRE_ACCOUNT_RESPONSE,
  PUT_WYRE_ACCOUNT,
  PUT_WYRE_ACCOUNT_RESPONSE,
  GET_WYRE_CONFIG,
  GET_WYRE_CONFIG_RESPONSE,
  CREATE_WYRE_PAYMENT,
  CREATE_WYRE_PAYMENT_RESPONSE,
  GET_EXCHANGE_RATES,
  GET_EXCHANGE_RATES_RESPONSE,
  GET_TRANSACTION_HISTORY,
  GET_TRANSACTION_HISTORY_RESPONSE,
  SET_COIN_STATUS,
  SIGN_IN_USER,
  AUTHENTICATE_USER,
  SET_COINMENU_FOCUS,
  OPEN_DLIGHT_SOCKET,
  CLOSE_DLIGHT_SOCKET,
  REQUEST_SEED_DATA,
  APP_SETUP,
  SET_ETH_TX_RECEIPTS,
  ADD_ETH_TX_RECEIPT,
  SET_COIN_SUB_WALLET,
  DISABLE_SELECT_DEFAULT_ACCOUNT,
  ADD_GOOD_SERVER,
  ADD_BAD_SERVER,
  SET_SECURE_LOADING_SUCCESS_DATA,
  SET_SECURE_LOADING_ERROR_DATA,
  CLEAR_SECURE_LOADING_DATA
} from "../utils/constants/storeType";

//Reducer Name: authentication
export const setAccounts = (accounts) => {
  return {
    type: SET_ACCOUNTS,
    payload: {
      accounts
    }
  }
}

//Reducer Name: authentication
export const signIntoAuthenticatedAccount = () => {
  return { type: SIGN_IN_USER }
}

//Reducer Name: authentication
export const disableSelectDefaultAccount = () => {
  return { type: DISABLE_SELECT_DEFAULT_ACCOUNT }
}

//Reducer Name: authentication
export const authenticateUser = (account, sessionKey) => {
  return {
    type: AUTHENTICATE_USER,
    activeAccount: account,
    sessionKey: sessionKey
  }
}

//Reducer Name: authentication
export const signOut = () => {
  return {
    type: SIGN_OUT,
  }
}

//Reducer Name: coins
export const setActiveCoin = (activeCoin) => {
  return {
    type: SET_ACTIVE_COIN,
    activeCoin: activeCoin
  }
}

//Reducer Name: settings
export const setConfigSection = (section) => {
  return {
    type: SET_CONFIG_SECTION,
    activeConfigSection: section
  }
}

//Reducer Name: settings
/*export const setWalletSettingsState = (state) => {
  return {
    type: 'SET_WALLET_SETTINGS_STATE',
    walletSettingsState: state
  }
}*/

//Reducer Name: settings
export const setAllSettings = (settings) => {
  return {
    type: SET_ALL_SETTINGS,
    settings
  }
}

//Reducer Name: settings
export const setCoinSettingsState = (state) => {
  return {
    type: SET_COIN_SETTINGS_STATE,
    coinSettings: state
  }
}

//Reducer Name: settings
export const setBuySellSettingsState = (state) => {
  return {
    type: SET_BUY_SELL_SETTINGS_STATE,
    wyreSettings: state
  }
}

//Reducer Name: settings
export const setGeneralWalletSettingsState = (state) => {
  return {
    type: SET_GENERAL_WALLET_SETTINGS_STATE,
    state
  }
}

//Reducer name: coins
export const setActiveApp = (activeApp) => {
  return {
    type: SET_ACTIVE_APP,
    activeApp: activeApp
  }
}

//Reducer name: coins
export const setActiveSection = (activeSection) => {
  return {
    type: SET_ACTIVE_SECTION,
    activeSection: activeSection
  }
}

//Reducer name: coins
export const setIsCoinMenuFocused = (isFocused) => {  
  return {
    type: SET_COINMENU_FOCUS,
    payload: {
      isFocused
    }
  }
}

//Reducer name: coins
export const setCoinList = (activeCoinList) => {
  return {
    type: SET_COIN_LIST,
    activeCoinList: activeCoinList
  }
}

export const setCoinStatus = (chainTicker, status) => {
  return {
    type: SET_COIN_STATUS,
    chainTicker,
    status
  }
}

//Reducer name: coins
export const setCurrentUserCoins = (activeCoinsForUser) => {
  return {
    type: SET_USER_COINS,
    payload: {
      activeCoinsForUser,
    },
  };
}

//Reducer name: coins
export const openDlightWallet = (chainTicker) => {
  return {
    type: OPEN_DLIGHT_SOCKET,
    payload: { chainTicker }
  }
}

//Reducer name: coins
export const closeDlightWallet = (chainTicker) => {
  return {
    type: CLOSE_DLIGHT_SOCKET,
    payload: { chainTicker }
  }
}

//Reducer name: ledger
export const setBalances = (balances) => {
  return {
    type: SET_BALANCES,
    balances: balances
  }
}


//Reducer name: coins
export const setBalanceShow = () => {
  return {
    type: SET_BALANCE_SHOW
  }
}

//Reducer name: ledger
export const setOneBalance = (coinId, balance) => {
  return {
    type: SET_ONE_BALANCE,
    balance,
    coinId
  }
}

//Reducer name: ledger
export const setTransactions = (transactions) => {
  return {
    type: SET_TRANSACTIONS,
    transactions: transactions
  }
}

//Reducer name: authentication
export const updateAccountKeys = (keys) => {
  return {
    type: UPDATE_ACCOUNT_KEYS,
    keys: keys
  }
}

//Reducer name: ledger
export const updateCoinRates = (rates) => {
  return {
    type: SET_RATES,
    rates: rates
  }
}

//Reducer Name: electrum
export const addServerVersion = (server, version) => {
  return {
    type: ADD_SERVER_VERSION,
    server: server,
    version: version
  }
}

//Reducer Name: electrum
export const recordGoodServer = (server) => {
  return {
    type: ADD_GOOD_SERVER,
    payload: { server }
  }
}

//Reducer Name: electrum
export const recordBadServer = (server) => {
  return {
    type: ADD_BAD_SERVER,
    payload: { server }
  }
}

//Reducer Name: electrum
export const setServerVersions = (serverVersions) => {
  return {
    type: SET_SERVER_VERSIONS,
    serverVersions: serverVersions
  }
}

//Reducer Name: headers
export const addBlockHeader = (header, height, coinID) => {
  let key = `${coinID}.${height}`
  return {
    type: ADD_HEADER,
    key: key,
    header: header
  }
}

//Reducer Name: headers
export const setBlockHeaders = (headers) => {
  return {
    type: SET_HEADERS,
    headers: headers
  }
}

//Reducer Name: headers
export const addTxReceipt = (receipt, txid) => {
  let key = txid
  return {
    type: ADD_ETH_TX_RECEIPT,
    key: key,
    receipt
  }
}

//Reducer Name: ethtxreceipts
export const setEthTxReceipts = (receipts) => {
  return {
    type: SET_ETH_TX_RECEIPTS,
    receipts
  }
}

export const clearDataCache = () => {
  return {
    type: CLEAR_CACHE,
  }
}

//Reducer name: customCoins
export const setActiveSectionCustomCoins = (activeSection) => {
  return {
    type: SET_ACTIVE_SECTION_CUSTOM_COIN,
    activeSection: activeSection
  }
}

//Reducer name: coinOverview
export const setActiveOverviewFilter = (chainTicker, filterType) => {
  return {
    type: SET_OVERVIEW_FILTER,
    payload: {
      chainTicker,
      filterType
    }
  }
}

export const setCoinSubWallet = (chainTicker, subWallet) => {
  return {
    type: SET_COIN_SUB_WALLET,
    payload: {
      chainTicker,
      subWallet
    }
  }
}

//Reducer name: buySellCrypto
export const setActiveSectionBuySellCrypto = (activeSection) => {
  return {
    type: SET_ACTIVE_SECTION_BUY_SELL_CRYPTO,
    activeSection: activeSection
  }
}

// Payment Method
export const createWyreAccount = () => ({
  type: CREATE_WYRE_ACCOUNT,
  payload: {},
});

export const createWyreAccountResponse = () => ({
  type: CREATE_WYRE_ACCOUNT_RESPONSE,
  payload: {},
});

export const getWyreAccount = () => ({
  type: GET_WYRE_ACCOUNT,
  payload: {},
});

export const getWyreAccountResponse = (account = {}) => ({
  type: GET_WYRE_ACCOUNT_RESPONSE,
  payload: {
    account,
  },
});

export const putWyreAccount = () => ({
  type: PUT_WYRE_ACCOUNT,
  payload: {},
});

export const putWyreAccountResponse = (account = {}) => ({
  type: PUT_WYRE_ACCOUNT_RESPONSE,
  payload: {
    account,
  },
});

export const getWyreConfig = () => ({
  type: GET_WYRE_CONFIG,
  payload: {},
});

export const getWyreConfigResponse = (config = {}) => ({
  type: GET_WYRE_CONFIG_RESPONSE,
  payload: {
    config,
  },
});

export const createWyrePayment = () => ({
  type: CREATE_WYRE_PAYMENT,
  payload: {},
});

export const createWyrePaymentResponse = (payment = {}) => ({
  type: CREATE_WYRE_PAYMENT_RESPONSE,
  payload: {
    payment,
  },
});

export const getActiveTransaction = () => ({
  type: GET_EXCHANGE_RATES,
  payload: {},
});

export const getActiveTransactionResponse = (rates = {}) => ({
  type: GET_EXCHANGE_RATES_RESPONSE,
  payload: {
    rates,
  },
});

export const getTransactionHistory = () => ({
  type: GET_TRANSACTION_HISTORY,
  payload: {},
});

export const getTransactionHistoryResponse = (history = {}) => ({
  type: GET_TRANSACTION_HISTORY_RESPONSE,
  payload: {
    history,
  }
});

export const requestSeedData = () => ({
  type: REQUEST_SEED_DATA,
  payload: {},
});

export const appSetup = () => ({
  type: APP_SETUP,
  payload: {},
});

export const setSecureLoadingData = (data, isSuccess) => ({
  type: isSuccess ? SET_SECURE_LOADING_SUCCESS_DATA : SET_SECURE_LOADING_ERROR_DATA,
  payload: { data }
})

export const clearSecureLoadingData = () => ({
  type: CLEAR_SECURE_LOADING_DATA
})