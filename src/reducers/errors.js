/*
  This reducer stores error handling data for API call information
*/

import {
  API_GET_TRANSACTIONS,
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_GET_INFO,
  INIT_DLIGHT_ERRORS,
  INIT_ELECTRUM_ERRORS,
  INIT_ETH_ERRORS,
  INIT_ERC20_ERRORS,
  CHANNELS_TEMPLATE
} from "../utils/constants/intervalConstants";
import {
  ERROR_BALANCES,
  ERROR_INFO,
  ERROR_TRANSACTIONS,
  ERROR_RATES,
  ERROR_DLIGHT_INIT,
  ERROR_ELECTRUM_INIT,
  ERROR_ERC20_INIT,
  ERROR_ETH_INIT,
  SET_BALANCES,
  SET_INFO,
  SET_TRANSACTIONS,
  SET_RATES,
  INIT_DLIGHT_CHANNEL
} from "../utils/constants/storeType";

export const errors = (state = {
  // Ledger calls for coins
  [API_GET_TRANSACTIONS]: CHANNELS_TEMPLATE,
  [API_GET_BALANCES]: CHANNELS_TEMPLATE,
  [API_GET_FIATPRICE]: CHANNELS_TEMPLATE,
  [API_GET_INFO]: CHANNELS_TEMPLATE,
  [INIT_DLIGHT_ERRORS]: {},
  [INIT_ELECTRUM_ERRORS]: {},
  [INIT_ETH_ERRORS]: {},
  [INIT_ERC20_ERRORS]: {}
}, action) => {
  const { channel, error, chainTicker } = action.payload || {}

  switch (action.type) {
    case ERROR_BALANCES:
      return {
        ...state,
        [API_GET_BALANCES]: {
          ...state[API_GET_BALANCES],
          [error.channel]: {
            ...state[API_GET_BALANCES][error.channel],
            [error.chainTicker]: error
          }
        }
      };
    case ERROR_INFO:
      return {
        ...state,
        [API_GET_INFO]: {
          ...state[API_GET_INFO],
          [error.channel]: {
            ...state[API_GET_INFO][error.channel],
            [error.chainTicker]: error
          }
        }
      };
    case ERROR_TRANSACTIONS:
      return {
        ...state,
        [API_GET_TRANSACTIONS]: {
          ...state[API_GET_TRANSACTIONS],
          [error.channel]: {
            ...state[API_GET_TRANSACTIONS][error.channel],
            [error.chainTicker]: error
          }
        }
      };
    case ERROR_RATES:
      return {
        ...state,
        [API_GET_FIATPRICE]: {
          ...state[API_GET_FIATPRICE],
          [error.channel]: {
            ...state[API_GET_FIATPRICE][error.channel],
            [error.chainTicker]: error
          }
        }
      };
    case ERROR_DLIGHT_INIT:
      return {
        ...state,
        [INIT_DLIGHT_ERRORS]: {
          ...state[INIT_DLIGHT_ERRORS],
          [chainTicker]: error
        }
      }
    case ERROR_ELECTRUM_INIT:
      return {
        ...state,
        [INIT_DLIGHT_ERRORS]: {
          ...state[INIT_DLIGHT_ERRORS],
          [chainTicker]: error
        }
      }
    case ERROR_ERC20_INIT:
      return {
        ...state,
        [INIT_DLIGHT_ERRORS]: {
          ...state[INIT_DLIGHT_ERRORS],
          [chainTicker]: error
        }
      }
    case ERROR_ETH_INIT:
      return {
        ...state,
        [INIT_DLIGHT_ERRORS]: {
          ...state[INIT_DLIGHT_ERRORS],
          [chainTicker]: error
        }
      }
    case INIT_DLIGHT_CHANNEL:
      return {
        ...state,
        [INIT_DLIGHT_ERRORS]: {
          ...state[INIT_DLIGHT_ERRORS],
          [chainTicker]: null
        }
      }
    case SET_BALANCES:
      return {
        ...state,
        [API_GET_BALANCES]: {
          ...state[API_GET_BALANCES],
          [channel]: {
            ...state[API_GET_BALANCES][channel],
            [chainTicker]: null
          }
        }
      };
    case SET_INFO:
      return {
        ...state,
        [API_GET_INFO]: {
          ...state[API_GET_INFO],
          [channel]: {
            ...state[API_GET_INFO][channel],
            [chainTicker]: null
          }
        }
      };
    case SET_TRANSACTIONS:
      return {
        ...state,
        [API_GET_TRANSACTIONS]: {
          ...state[API_GET_TRANSACTIONS],
          [channel]: {
            ...state[API_GET_TRANSACTIONS][channel],
            [chainTicker]: null
          }
        }
      };
    case SET_RATES:
      return {
        ...state,
        [API_GET_FIATPRICE]: {
          ...state[API_GET_FIATPRICE],
          [channel]: {
            ...state[API_GET_FIATPRICE][channel],
            [chainTicker]: null
          }
        }
      };
    default:
      return state;
  }
}