export * from './actions/Coins';
export * from './actions/UserData';
export * from './actions/Ledger';

export const addAccount = (accounts) => {
  return {
    type: 'ADD_ACCOUNT',
    newAccounts: accounts
  }
}

export const setAccounts = (accounts) => {
  return {
    type: 'SET_ACCOUNTS',
    accounts: accounts
  }
}

export const signIntoAccount = (account) => {
  return {
    type: 'SIGN_IN',
    activeAccount: account
  }
}

export const signOut = () => {
  return {
    type: 'SIGN_OUT',
  }
}

export const setLock = (locked) => {
  return {
    type: 'UNLOCK',
    locked: locked
  }
}

export const setFingerAuth = (isEnabled) => {
  return {
    type: 'FINGER_AUTH',
    fingerPrint: isEnabled
  }
}

export const addActiveCoin = (newCoinObj) => {
  return {
    type: 'ADD_ACTIVE_COIN',
    newCoin: newCoinObj
  }
}

export const setActiveCoin = (activeCoin) => {
  return {
    type: 'SET_ACTIVE_COIN',
    activeCoin: activeCoin
  }
}

export const setActiveApp = (activeApp) => {
  return {
    type: 'SET_ACTIVE_APP',
    activeApp: activeApp
  }
}

export const setActiveSection = (activeSection) => {
  return {
    type: 'SET_ACTIVE_SECTION',
    activeSection: activeSection
  }
}

export const setCoinList = (activeCoinList) => {
  return {
    type: 'SET_COIN_LIST',
    activeCoinList: activeCoinList
  }
}

export const setCurrentUserCoins = (activeCoinsForUser, coinsToUpdate) => {
  return {
    type: 'SET_USER_COINS',
    activeCoinsForUser: activeCoinsForUser,
    coinsToUpdate: coinsToUpdate
  }
}

export const setBalances = (balances) => {
  return {
    type: 'SET_BALANCES',
    balances: balances
  }
}

export const setTransactions = (transactions, needsUpdateObj) => {
  return {
    type: 'SET_TRANSACTIONS',
    transactions: transactions,
    needsUpdateObj: needsUpdateObj
  }
}

export const needsUpdate = (component) => {
  let actionType = (component.toUpperCase()) + "_NEED_UPDATE"

  return {
    type: actionType,
  }
}

export const transactionsNeedUpdate = (coinID, needsUpdateObj) => {
  let _needsUpdateObj = needsUpdateObj ? needsUpdateObj : {}
  _needsUpdateObj[coinID] = true

  return {
    type: 'TRANSACTIONS_NEED_UPDATE',
    needsUpdateObj: _needsUpdateObj
  }
}

export const everythingNeedsUpdate = () => {
  return {
    type: 'EVERYTHING_NEEDS_UPDATE',
  }
}

export const updateAccountKeys = (keys) => {
  return {
    type: 'UPDATE_ACCOUNT_KEYS',
    keys: keys
  }
}

export const updateCoinRates = (rates) => {
  return {
    type: 'SET_RATES',
    rates: rates
  }
}

