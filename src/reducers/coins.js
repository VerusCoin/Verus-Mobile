/*
  The coin reducer conatains general coin information NOT
  fetched from electrum. This includes data stored in AsyncStorage.
*/

export const coins = (state = {
  activeCoinList: [],
  activeCoin: {id: null},
  activeCoinsForUser: [],
  activeApp: null,
  activeSection: null
}, action) => {
  //TODO: Change coin lists to objects not arrays
  switch (action.type) {
    case 'SET_ACTIVE_COIN':
      return {
        ...state,
        activeCoin: action.activeCoin,
      };
    case 'SET_ACTIVE_APP':
      return {
        ...state,
        activeApp: action.activeApp,
      };
    case 'SET_ACTIVE_SECTION':
      return {
        ...state,
        activeSection: action.activeSection,
      };
    case 'SET_COIN_LIST':
      return {
        ...state,
        activeCoinList: action.activeCoinList,
      };
    case 'SET_USER_COINS':
      return {
        ...state,
        activeCoinsForUser: action.activeCoinsForUser,
      };
    default:
      return state;
  }
}