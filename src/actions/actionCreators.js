export * from './actions/Coins';
export * from './actions/UserData';
export * from './actions/WalletSettings';
export * from './actions/cache/Electrum';
export * from './actions/cache/Headers';
export * from './actions/cache/Cache';
export * from './actions/updateManager';

import {
  SET_ACCOUNTS,
  SIGN_OUT,
  FINGER_AUTH,
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
  SET_ONE_BALANCE,
  SET_TRANSACTIONS,
  // SET_INTERVAL_ID,
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
  REQUEST_SEED_DATA,
  SET_ACTIVE_IDENTITY,
  STORE_IDENTITIES,
  SET_CLAIMS,
  SET_CLAIM_CATEGORIES,
  SET_ATTESTATIONS,
  SET_ACTIVE_CLAIM_CATEGORY_ID,
  TOGGLE_ATTESTATION_PIN,
  SET_ATTESTATION_PINNED,
  SET_ACTIVE_ATTESTATION_ID,
  SET_ACTIVE_CLAIM,
  SET_IDENTITIES,
  ADD_NEW_IDENTITY_NAME,
  ADD_NEW_IDENTITY,
  CHANGE_ACTIVE_IDENTITY,
  DESELECT_ACTIVE_IDENTITY,
  SET_NEW_ACTIVE_IDENTITY,
  APP_SETUP,
  SET_SHOW_EMPTY_CLAIM_CATEGORIES,
  ADD_NEW_CATEGORY,
  SET_NEW_CATEGORY,
  SET_CLAIM_VISIBILITY,
  SET_SHOW_HIDDEN_CLAIMS,
  UPDATE_SELECTED_CLAIMS,
  CLEAR_SELECTED_CLAIMS,
  UPDATE_CATEGORY_FOR_CLAIMS,
  MOVE_CLAIMS_TO_CATEGORY,
} from '../utils/constants/storeType';

// Reducer Name: authentication
export const setAccounts = (accounts) => ({
  type: SET_ACCOUNTS,
  accounts,
});

// Reducer Name: authentication
export const signIntoAuthenticatedAccount = () => ({ type: SIGN_IN_USER });

// Reducer Name: authentication
export const authenticateUser = (account) => ({
  type: AUTHENTICATE_USER,
  activeAccount: account,
});

// Reducer Name: authentication
export const signOut = () => ({
  type: SIGN_OUT,
});

// TODO: Setup finger authentication with this method in redux store
// Reducer Name: authentication
export const setFingerAuth = (isEnabled) => ({
  type: FINGER_AUTH,
  fingerPrint: isEnabled,
});

// Reducer Name: coins
export const setActiveCoin = (activeCoin) => ({
  type: SET_ACTIVE_COIN,
  activeCoin,
});

// Reducer Name: settings
export const setConfigSection = (section) => ({
  type: SET_CONFIG_SECTION,
  activeConfigSection: section,
});

// Reducer Name: settings
/* export const setWalletSettingsState = (state) => {
  return {
    type: 'SET_WALLET_SETTINGS_STATE',
    walletSettingsState: state
  }
} */

// Reducer Name: settings
export const setAllSettings = (settings) => ({
  type: SET_ALL_SETTINGS,
  settings,
});

// Reducer Name: settings
export const setCoinSettingsState = (state) => ({
  type: SET_COIN_SETTINGS_STATE,
  coinSettings: state,
});

// Reducer Name: settings
export const setBuySellSettingsState = (state) => ({
  type: SET_BUY_SELL_SETTINGS_STATE,
  wyreSettings: state,
});

// Reducer Name: settings
export const setGeneralWalletSettingsState = (state) => ({
  type: SET_GENERAL_WALLET_SETTINGS_STATE,
  state,
});

// Reducer name: coins
export const setActiveApp = (activeApp) => ({
  type: SET_ACTIVE_APP,
  activeApp,
});

// Reducer name: coins
export const setActiveSection = (activeSection) => ({
  type: SET_ACTIVE_SECTION,
  activeSection,
});

// Reducer name: coins
export const setIsCoinMenuFocused = (isFocused) => ({
  type: SET_COINMENU_FOCUS,
  payload: {
    isFocused,
  },
});

// Reducer name: coins
export const setCoinList = (activeCoinList) => ({
  type: SET_COIN_LIST,
  activeCoinList,
});

export const setCoinStatus = (chainTicker, status) => ({
  type: SET_COIN_STATUS,
  chainTicker,
  status,
});

// Reducer name: coins
export const setCurrentUserCoins = (activeCoinsForUser) => ({
  type: SET_USER_COINS,
  activeCoinsForUser,
});

// Reducer name: ledger
export const setBalances = (balances) => ({
  type: SET_BALANCES,
  balances,
});

// Reducer name: ledger
export const setOneBalance = (coinId, balance) => ({
  type: SET_ONE_BALANCE,
  balance,
  coinId,
});

// Reducer name: ledger
export const setTransactions = (transactions) => ({
  type: SET_TRANSACTIONS,
  transactions,
});

// Reducer name: authentication
export const updateAccountKeys = (keys) => ({
  type: UPDATE_ACCOUNT_KEYS,
  keys,
});

// Reducer name: ledger
export const updateCoinRates = (rates) => ({
  type: SET_RATES,
  rates,
});

// Reducer Name: electrum
export const addServerVersion = (server, version) => ({
  type: ADD_SERVER_VERSION,
  server,
  version,
});

// Reducer Name: electrum
export const setServerVersions = (serverVersions) => ({
  type: SET_SERVER_VERSIONS,
  serverVersions,
});

// Reducer Name: headers
export const addBlockHeader = (header, height, coinID) => {
  const key = `${coinID}.${height}`;
  return {
    type: ADD_HEADER,
    key,
    header,
  };
};

// Reducer Name: headers
export const setBlockHeaders = (headers) => ({
  type: SET_HEADERS,
  headers,
});

export const clearDataCache = () => ({
  type: CLEAR_CACHE,
});

// Reducer name: customCoins
export const setActiveSectionCustomCoins = (activeSection) => ({
  type: SET_ACTIVE_SECTION_CUSTOM_COIN,
  activeSection,
});

// Reducer name: coinOverview
export const setActiveOverviewFilter = (chainTicker, filterType) => {
  // DELET
  console.log('SETTING FILTER FOR');
  console.log(`${chainTicker}, ${filterType}`);
  return {
    type: SET_OVERVIEW_FILTER,
    payload: {
      chainTicker,
      filterType,
    },
  };
};

// Reducer name: buySellCrypto
export const setActiveSectionBuySellCrypto = (activeSection) => ({
  type: SET_ACTIVE_SECTION_BUY_SELL_CRYPTO,
  activeSection,
});

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
  },
});

export const requestSeedData = () => ({
  type: REQUEST_SEED_DATA,
});

export const setActiveIdentity = (identityId) => ({
  type: SET_ACTIVE_IDENTITY,
  payload: { identityId },
});

export const storeIdentities = () => ({
  type: STORE_IDENTITIES,
});

export const setClaims = (claims) => ({
  type: SET_CLAIMS,
  payload: { claims },
});

export const setClaimCategories = (claimCategories) => ({
  type: SET_CLAIM_CATEGORIES,
  payload: { claimCategories },
});

export const setAttestations = (attestations) => ({
  type: SET_ATTESTATIONS,
  payload: { attestations },
});

export const setActiveClaimCategory = (activeClaimCategoryId) => ({
  type: SET_ACTIVE_CLAIM_CATEGORY_ID,
  payload: { activeClaimCategoryId },
});

export const toggleAttestationPin = (value) => ({
  type: TOGGLE_ATTESTATION_PIN,
  payload: { value },
});

export const setAttestationPinned = (attestationId, value) => ({
  type: SET_ATTESTATION_PINNED,
  payload: { attestationId, value },
});

export const setActiveClaim = (activeClaim) => ({
  type: SET_ACTIVE_CLAIM,
  payload: { activeClaim },
});

export const setActiveAttestationId = (activeAttestationId) => ({
  type: SET_ACTIVE_ATTESTATION_ID,
  payload: { activeAttestationId },
});

export const setIdentities = (identities) => ({
  type: SET_IDENTITIES,
  payload: { identities },
});

export const addNewIdentityName = (identityName) => ({
  type: ADD_NEW_IDENTITY_NAME,
  payload: { identityName },
});

export const addNewIdentity = (identity) => ({
  type: ADD_NEW_IDENTITY,
  payload: { identity },
});

export const changeActiveIdentity = (newActiveIdentityId) => ({
  type: CHANGE_ACTIVE_IDENTITY,
  payload: { newActiveIdentityId },
});

export const deselectActiveIdentity = (activeIdentityId) => ({
  type: DESELECT_ACTIVE_IDENTITY,
  payload: { activeIdentityId },
});

export const setNewActiveIdentity = (newActiveIdentityId) => ({
  type: SET_NEW_ACTIVE_IDENTITY,
  payload: { newActiveIdentityId },
});

export const appSetup = () => ({
  type: APP_SETUP,
});

export const setShowEmptyClaimCategories = (value) => ({
  type: SET_SHOW_EMPTY_CLAIM_CATEGORIES,
  payload: { value },
});

export const setShowHiddenClaims = (value) => ({
  type: SET_SHOW_HIDDEN_CLAIMS,
  payload: { value },
});

export const addNewCategory = (value) => ({
  type: ADD_NEW_CATEGORY,
  payload: { value },
});

export const setNewCategory = (category) => ({
  type: SET_NEW_CATEGORY,
  payload: { category },
});

export const setClaimVisibility = (claim, value) => ({
  type: SET_CLAIM_VISIBILITY,
  payload: { claim, value },
});

export const updateSelectedClaims = (claim) => ({
  type: UPDATE_SELECTED_CLAIMS,
  payload: { claim },
});

export const clearSelectedClaims = () => ({
  type: CLEAR_SELECTED_CLAIMS,
});

export const updateCategoryForClaims = (claims, categoryId) => ({
  type: UPDATE_CATEGORY_FOR_CLAIMS,
  payload: { claims, categoryId },
});

export const moveClaimsToCategory = (targetCategory) => ({
  type: MOVE_CLAIMS_TO_CATEGORY,
  payload: { targetCategory },
});
