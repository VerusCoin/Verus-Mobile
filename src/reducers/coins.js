export const coins = (state = {
  activeCoinList: [],
  activeCoin: {id: null},
  activeCoinsForUser: [],
  activeApp: null,
  activeSection: null
}, action) => {
  switch (action.type) {
    case 'ADD_ACTIVE_COIN':
      let newActiveCoinList = state.activeCoinList.slice()
      newActiveCoinList.push(action.newCoin)
      return {
        ...state, 
        activeCoinList: newActiveCoinList,
      };
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