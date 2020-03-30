/*
  The ledger reducer generally conatains coin information fetched from electrum
  calls and wallet information. The needsupdate booleans are to be set to true when the 
  program assumes some element of the ledger has changed and needs to be re-fetched, 
  and set to false again when that componenet updates.
*/

import { namesList } from '../utils/CoinData/CoinData'
//TODO: Change this to get coin names from activeCoinForUser
//so that when people add custom coins they also get told to 
//update

import {
  SET_BALANCES,
  SET_RATES,
  SET_TRANSACTIONS,
  SIGN_OUT,
  //SET_ONE_BALANCE,
  //BALANCES_NEED_UPDATE,
  //TRANSACTIONS_NEED_UPDATE,
  //RATES_NEED_UPDATE,
  //EVERYTHING_NEEDS_UPDATE,
  //SET_INTERVAL_ID,
  SET_INFO
} from '../utils/constants/storeType'
import {
  ELECTRUM,
  DLIGHT,
  GENERAL
} from "../utils/constants/intervalConstants";

export const ledger = (state = {
  balances: {
    [ELECTRUM]: {},
    [DLIGHT]: {},
    [GENERAL]: {},
  },
  transactions: {
    [ELECTRUM]: {},
    [DLIGHT]: {},
    [GENERAL]: {},
  },
  rates: {
    [ELECTRUM]: {},
    [DLIGHT]: {},
    [GENERAL]: {},
  },
  info: {
    [ELECTRUM]: {},
    [DLIGHT]: {},
    [GENERAL]: {},
  }
}, action) => {
  const { chainTicker, channel, body } = action.payload || {}

  switch (action.type) {
    case SET_BALANCES:
      return {
        ...state,
        balances: {
          ...state.balances,
          [channel]: { ...state.balances[channel], [chainTicker]: body }
        }
      };
    case SET_INFO:
      return {
        ...state,
        info: {
          ...state.info,
          [channel]: { ...state.info[channel], [chainTicker]: body }
        }
      };
    case SET_TRANSACTIONS:
      return {
        ...state,
        transactions: {
          ...state.transactions,
          [channel]: { ...state.transactions[channel], [chainTicker]: body }
        }
      };
    case SET_RATES:
      return {
        ...state,
        rates: {
          ...state.rates,
          [channel]: { ...state.rates[channel], [chainTicker]: body }
        }
      };
    case SIGN_OUT:
      return {
        ...state,
        balances: {
          [ELECTRUM]: {},
          [DLIGHT]: {},
          [GENERAL]: {},
        },
        transactions: {
          [ELECTRUM]: {},
          [DLIGHT]: {},
          [GENERAL]: {},
        },
        rates: {
          [ELECTRUM]: {},
          [DLIGHT]: {},
          [GENERAL]: {},
        },
        info: {
          [ELECTRUM]: {},
          [DLIGHT]: {},
          [GENERAL]: {},
        },
      };
    /*case SET_INTERVAL_ID:
      return {
        ...state,
        updateIntervalID: action.updateIntervalID
      };*/
    default:
      return state;
  }
}