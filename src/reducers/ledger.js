import { namesList } from '../utils/CoinData'
//TODO: Change this to get coin names from activeCoinForUser
//so that when people add custom coins they also get told to 
//update

export const ledger = (state = {
  balances: {},
  transactions: {},
  rates: {},
  needsUpdate: {balances: true, transactions: {}, rates: true}
}, action) => {
  switch (action.type) {
    case 'SET_BALANCES':
      return {
        ...state,
        balances: action.balances,
        needsUpdate: {balances: false, 
                      transactions: state.needsUpdate.transactions,
                      rates: state.needsUpdate.rates}
      };
    case 'SET_TRANSACTIONS':
      return {
        ...state,
        transactions: action.transactions,
        needsUpdate: {balances: state.needsUpdate.balances, 
                      transactions: action.needsUpdateObj,
                      rates: state.needsUpdate.rates}
      };
    case 'SET_RATES':
      return {
        ...state,
        rates: action.rates,
        needsUpdate: {balances: state.needsUpdate.balances, 
                      transactions: state.needsUpdate.transactions,
                      rates: false}
      };
    case 'BALANCES_NEED_UPDATE':
      return {
        ...state,
        needsUpdate: {balances: true, 
                      transactions: state.needsUpdate.transactions,
                      rates: state.needsUpdate.rates}
      };
    case 'TRANSACTIONS_NEED_UPDATE':
      return {
        ...state,
        needsUpdate: {balances: state.needsUpdate.balances, 
                      transactions: action.needsUpdateObj,
                      rates: state.needsUpdate.rates}
      };
    case 'RATES_NEED_UPDATE':
      return {
        ...state,
        needsUpdate: {balances: state.needsUpdate.balances, 
                      transactions: state.needsUpdate.transactions,
                      rates: true}
      };
    case 'EVERYTHING_NEEDS_UPDATE':
      let _transactions = state.needsUpdate.transactions
      for (let i = 0; i < namesList.length; i++) {
        _transactions[namesList[i]] = true
      }
      return {
        ...state,
        needsUpdate: {balances: true, 
                      transactions: _transactions,
                      rates: true}
      };
    case 'SIGN_OUT':
      return {
        ...state,
        balances: {},
        transactions: {},
        rates: {},
      };
    default:
      return state;
  }
}