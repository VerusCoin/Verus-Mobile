export * from './actions/Coins'
export * from './actions/UserData'
export * from './actions/Ledger'
export * from './actions/WalletSettings'
export * from './actions/cache/Electrum'
export * from './actions/cache/Headers'
export * from './actions/cache/Cache'

//Reducer Name: authentication
export const setAccounts = (accounts) => {
  return {
    type: 'SET_ACCOUNTS',
    accounts: accounts
  }
}

//Reducer Name: authentication
export const signIntoAccount = (account) => {
  return {
    type: 'SIGN_IN',
    activeAccount: account
  }
}

//Reducer Name: authentication
export const signOut = () => {
  return {
    type: 'SIGN_OUT',
  }
}

//TODO: Setup finger authentication with this method in redux store
//Reducer Name: authentication
export const setFingerAuth = (isEnabled) => {
  return {
    type: 'FINGER_AUTH',
    fingerPrint: isEnabled
  }
}

//Reducer Name: coins
export const addActiveCoin = (newCoinObj) => {
  return {
    type: 'ADD_ACTIVE_COIN',
    newCoin: newCoinObj
  }
}

//Reducer Name: coins
export const setActiveCoin = (activeCoin) => {
  return {
    type: 'SET_ACTIVE_COIN',
    activeCoin: activeCoin
  }
}

//Reducer Name: settings
export const setConfigSection = (section) => {
  return {
    type: 'SET_CONFIG_SECTION',
    activeConfigSection: section
  }
}

//Reducer Name: settings
export const setWalletSettingsState = (state) => {
  return {
    type: 'SET_WALLET_SETTINGS_STATE',
    walletSettingsState: state
  }
}

//Reducer name: coins
export const setActiveApp = (activeApp) => {
  return {
    type: 'SET_ACTIVE_APP',
    activeApp: activeApp
  }
}

//Reducer name: coins
export const setActiveSection = (activeSection) => {
  return {
    type: 'SET_ACTIVE_SECTION',
    activeSection: activeSection
  }
}

//Reducer name: coins
export const setCoinList = (activeCoinList) => {
  return {
    type: 'SET_COIN_LIST',
    activeCoinList: activeCoinList
  }
}

//Reducer name: coins
export const setCurrentUserCoins = (activeCoinsForUser, coinsToUpdate) => {
  return {
    type: 'SET_USER_COINS',
    activeCoinsForUser: activeCoinsForUser,
    coinsToUpdate: coinsToUpdate
  }
}

//Reducer name: ledger
export const setBalances = (balances) => {
  return {
    type: 'SET_BALANCES',
    balances: balances
  }
}

//Reducer name: ledger
export const setTransactions = (transactions, needsUpdateObj) => {
  return {
    type: 'SET_TRANSACTIONS',
    transactions: transactions,
    needsUpdateObj: needsUpdateObj
  }
}

//This sets the ID for the app heartbeat data update interval
//so that it can be cleared from any active component
//Reducer name: ledger
export const setUpdateIntervalID = (ID) => {
  return {
    type: 'SET_INTERVAL_ID',
    updateIntervalID: ID
  }
}

//Reducer name: authentication
export const updateAccountKeys = (keys) => {
  return {
    type: 'UPDATE_ACCOUNT_KEYS',
    keys: keys
  }
}

//Reducer name: ledger
export const updateCoinRates = (rates) => {
  return {
    type: 'SET_RATES',
    rates: rates
  }
}

//Reducer name: ledger
export const transactionsNeedUpdate = (coinID, needsUpdateObj) => {
  let _needsUpdateObj = needsUpdateObj ? needsUpdateObj : {}
  _needsUpdateObj[coinID] = true

  return {
    type: 'TRANSACTIONS_NEED_UPDATE',
    needsUpdateObj: _needsUpdateObj
  }
}

//Reducer name: ledger
export const needsUpdate = (component) => {
  let actionType = (component.toUpperCase()) + "_NEED_UPDATE"

  return {
    type: actionType,
  }
}

//Reducer name: ledger
export const everythingNeedsUpdate = () => {
  return {
    type: 'EVERYTHING_NEEDS_UPDATE',
  }
}

//Reducer Name: electrum
export const addServerVersion = (server, version) => {
  return {
    type: 'ADD_SERVER_VERSION',
    server: server,
    version: version
  }
}

//Reducer Name: electrum
export const setServerVersions = (serverVersions) => {
  return {
    type: 'SET_SERVER_VERSIONS',
    serverVersions: serverVersions
  }
}

//Reducer Name: headers
export const addBlockHeader = (header, height, coinID) => {
  let key = `${coinID}.${height}`
  return {
    type: 'ADD_HEADER',
    key: key,
    header: header
  }
}

//Reducer Name: headers
export const setBlockHeaders = (headers) => {
  return {
    type: 'SET_HEADERS',
    headers: headers
  }
}

export const clearDataCache = () => {
  return {
    type: 'CLEAR_CACHE',
  }
}

