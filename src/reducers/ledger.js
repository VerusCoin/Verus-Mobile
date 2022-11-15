/*
  The ledger reducer generally conatains coin information fetched from electrum
  calls and wallet information. The needsupdate booleans are to be set to true when the 
  program assumes some element of the ledger has changed and needs to be re-fetched, 
  and set to false again when that componenet updates.
*/

import {
  SET_BALANCES,
  SET_RATES,
  SET_TRANSACTIONS,
  SIGN_OUT_COMPLETE,
  SET_INFO,
  SET_CONVERSION_PATHS,
  SET_WITHDRAW_DESTINATIONS,
  SET_DEPOSIT_SOURCES,
  SET_PENDING_DEPOSITS,
  SET_LINKED_IDENTITIES,
  LOG_NEW_CHANNELS
} from '../utils/constants/storeType'
import {
  BALANCES,
  CHANNELS_OBJECT_TEMPLATE,
  CONVERSIONS,
  DEPOSIT_SOURCES,
  INFO,
  LEDGER_KEYS,
  LINKED_IDS,
  PENDING_DEPOSITS,
  RATES,
  TRANSACTIONS,
  WITHDRAW_DESTINATIONS
} from "../utils/constants/intervalConstants";

export const ledger = (state = {
  [BALANCES]: CHANNELS_OBJECT_TEMPLATE,
  [TRANSACTIONS]: CHANNELS_OBJECT_TEMPLATE,
  [RATES]: CHANNELS_OBJECT_TEMPLATE,
  [INFO]: CHANNELS_OBJECT_TEMPLATE,
  [CONVERSIONS]: CHANNELS_OBJECT_TEMPLATE,
  [WITHDRAW_DESTINATIONS]: CHANNELS_OBJECT_TEMPLATE,
  [DEPOSIT_SOURCES]: CHANNELS_OBJECT_TEMPLATE,
  [PENDING_DEPOSITS]: CHANNELS_OBJECT_TEMPLATE,
  [LINKED_IDS]: CHANNELS_OBJECT_TEMPLATE
}, action) => {
  const { chainTicker, channel, body } = action.payload || {}

  switch (action.type) {
    case SET_BALANCES:
      return {
        ...state,
        balances: {
          ...state.balances,
          [channel]: { ...state.balances[channel], [chainTicker]: body },
        },
      };
    case SET_INFO:
      return {
        ...state,
        info: {
          ...state.info,
          [channel]: { ...state.info[channel], [chainTicker]: body },
        },
      };
    case SET_CONVERSION_PATHS:
      return {
        ...state,
        conversions: {
          ...state.conversions,
          [channel]: { ...state.conversions[channel], [chainTicker]: body },
        },
      };
    case SET_WITHDRAW_DESTINATIONS:
      return {
        ...state,
        withdrawDestinations: {
          ...state.withdrawDestinations,
          [channel]: { ...state.withdrawDestinations[channel], [chainTicker]: body },
        },
      };
    case SET_DEPOSIT_SOURCES:
      return {
        ...state,
        depositSources: {
          ...state.depositSources,
          [channel]: { ...state.depositSources[channel], [chainTicker]: body },
        },
      };
    case SET_PENDING_DEPOSITS:
      return {
        ...state,
        pendingDeposits: {
          ...state.pendingDeposits,
          [channel]: { ...state.pendingDeposits[channel], [chainTicker]: body },
        },
      };
    case SET_TRANSACTIONS:
      return {
        ...state,
        transactions: {
          ...state.transactions,
          [channel]: { ...state.transactions[channel], [chainTicker]: body },
        },
      };
    case SET_RATES:
      return {
        ...state,
        rates: {
          ...state.rates,
          [channel]: { ...state.rates[channel], [chainTicker]: body },
        },
      };
    case SET_LINKED_IDENTITIES:
      return {
        ...state,
        linkedIdentities: {
          ...state.linkedIdentities,
          [channel]: { ...state.linkedIdentities[channel], [chainTicker]: body },
        },
      };
    case LOG_NEW_CHANNELS:
      let _state = {}
      
      for (const ledgerKey of LEDGER_KEYS) {
        _state[ledgerKey] = {...state[ledgerKey]};

        for (const newChannel of action.payload.channels) {
          if (!_state[ledgerKey][newChannel]) {
            _state[ledgerKey] = {
              ...state[ledgerKey],
              [newChannel]: {}
            }
          }
        }
      }

      return {
        ...state,
        ..._state
      }
    case SIGN_OUT_COMPLETE:
      return {
        ...state,
        balances: CHANNELS_OBJECT_TEMPLATE,
        transactions: CHANNELS_OBJECT_TEMPLATE,
        rates: CHANNELS_OBJECT_TEMPLATE,
        info: CHANNELS_OBJECT_TEMPLATE,
        conversions: CHANNELS_OBJECT_TEMPLATE,
        withdrawDestinations: CHANNELS_OBJECT_TEMPLATE,
        depositSources: CHANNELS_OBJECT_TEMPLATE,
        pendingDeposits: CHANNELS_OBJECT_TEMPLATE
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