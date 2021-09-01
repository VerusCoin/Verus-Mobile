/*
  This reducer stores error handling data for API call information
*/

import {
  API_GET_TRANSACTIONS,
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_GET_INFO,
  INIT_DLIGHT_PRIVATE_ERRORS,
  INIT_ELECTRUM_ERRORS,
  INIT_ETH_ERRORS,
  INIT_ERC20_ERRORS,
  CHANNELS_OBJECT_TEMPLATE,
  API_GET_SERVICE_ACCOUNT,
  API_GET_SERVICE_PAYMENT_METHODS,
  API_GET_SERVICE_TRANSFERS,
  API_GET_SERVICE_RATES,
  API_GET_CONVERSION_PATHS,
  API_GET_WITHDRAW_DESTINATIONS
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
  INIT_DLIGHT_CHANNEL_START,
  ERROR_SERVICE_ACCOUNT,
  SET_SERVICE_ACCOUNT,
  SET_SERVICE_PAYMENT_METHODS,
  ERROR_SERVICE_PAYMENT_METHODS,
  SET_SERVICE_TRANSFERS,
  ERROR_SERVICE_TRANSFERS,
  SET_SERVICE_RATES,
  ERROR_SERVICE_RATES,
  SET_CONVERSION_PATHS,
  ERROR_CONVERSION_PATHS,
  ERROR_WITHDRAW_DESTINATIONS,
  SET_WITHDRAW_DESTINATIONS
} from "../utils/constants/storeType";

export const errors = (state = {
  // Ledger calls for coins
  [API_GET_TRANSACTIONS]: CHANNELS_OBJECT_TEMPLATE,
  [API_GET_BALANCES]: CHANNELS_OBJECT_TEMPLATE,
  [API_GET_FIATPRICE]: CHANNELS_OBJECT_TEMPLATE,
  [API_GET_INFO]: CHANNELS_OBJECT_TEMPLATE,
  [INIT_DLIGHT_PRIVATE_ERRORS]: {},
  [INIT_ELECTRUM_ERRORS]: {},
  [INIT_ETH_ERRORS]: {},
  [INIT_ERC20_ERRORS]: {},
  [API_GET_SERVICE_ACCOUNT]: {},
  [API_GET_SERVICE_TRANSFERS]: {},
  [API_GET_CONVERSION_PATHS]: {},
  [API_GET_WITHDRAW_DESTINATIONS]: {}
}, action) => {
  const { channel, error, chainTicker } = action.payload || {}

  switch (action.type) {
    case ERROR_BALANCES:
      return {
        ...state,
        [API_GET_BALANCES]: {
          ...state[API_GET_BALANCES],
          [channel]: {
            ...state[API_GET_BALANCES][channel],
            [chainTicker]: error
          }
        }
      };
    case ERROR_INFO:
      return {
        ...state,
        [API_GET_INFO]: {
          ...state[API_GET_INFO],
          [channel]: {
            ...state[API_GET_INFO][channel],
            [chainTicker]: error
          }
        }
      };
    case ERROR_CONVERSION_PATHS:
      return {
        ...state,
        [API_GET_CONVERSION_PATHS]: {
          ...state[API_GET_CONVERSION_PATHS],
          [channel]: {
            ...state[API_GET_CONVERSION_PATHS][channel],
            [chainTicker]: error
          }
        }
      };
    case ERROR_WITHDRAW_DESTINATIONS:
      return {
        ...state,
        [API_GET_WITHDRAW_DESTINATIONS]: {
          ...state[API_GET_WITHDRAW_DESTINATIONS],
          [channel]: {
            ...state[API_GET_WITHDRAW_DESTINATIONS][channel],
            [chainTicker]: error
          }
        }
      };
    case ERROR_TRANSACTIONS:
      return {
        ...state,
        [API_GET_TRANSACTIONS]: {
          ...state[API_GET_TRANSACTIONS],
          [channel]: {
            ...state[API_GET_TRANSACTIONS][channel],
            [chainTicker]: error
          }
        }
      };
    case ERROR_RATES:
      return {
        ...state,
        [API_GET_FIATPRICE]: {
          ...state[API_GET_FIATPRICE],
          [channel]: {
            ...state[API_GET_FIATPRICE][channel],
            [chainTicker]: error
          }
        }
      };
    case ERROR_DLIGHT_INIT:
      return {
        ...state,
        [INIT_DLIGHT_PRIVATE_ERRORS]: {
          ...state[INIT_DLIGHT_PRIVATE_ERRORS],
          [chainTicker]: error
        }
      }
    case ERROR_ELECTRUM_INIT:
      return {
        ...state,
        [INIT_DLIGHT_PRIVATE_ERRORS]: {
          ...state[INIT_DLIGHT_PRIVATE_ERRORS],
          [chainTicker]: error
        }
      }
    case ERROR_ERC20_INIT:
      return {
        ...state,
        [INIT_DLIGHT_PRIVATE_ERRORS]: {
          ...state[INIT_DLIGHT_PRIVATE_ERRORS],
          [chainTicker]: error
        }
      }
    case ERROR_ETH_INIT:
      return {
        ...state,
        [INIT_DLIGHT_PRIVATE_ERRORS]: {
          ...state[INIT_DLIGHT_PRIVATE_ERRORS],
          [chainTicker]: error
        }
      }
    case ERROR_SERVICE_ACCOUNT:
      return {
        ...state,
        [API_GET_SERVICE_ACCOUNT]: {
          ...state[API_GET_SERVICE_ACCOUNT],
          [channel]: error
        }
      }
    case ERROR_SERVICE_PAYMENT_METHODS:
      return {
        ...state,
        [API_GET_SERVICE_PAYMENT_METHODS]: {
          ...state[API_GET_SERVICE_PAYMENT_METHODS],
          [channel]: error
        }
      }
    case ERROR_SERVICE_TRANSFERS:
      return {
        ...state,
        [API_GET_SERVICE_TRANSFERS]: {
          ...state[API_GET_SERVICE_TRANSFERS],
          [channel]: error
        }
      }
    case ERROR_SERVICE_RATES:
      return {
        ...state,
        [API_GET_SERVICE_RATES]: {
          ...state[API_GET_SERVICE_RATES],
          [channel]: error
        }
      }
    case INIT_DLIGHT_CHANNEL_START:
      return {
        ...state,
        [INIT_DLIGHT_PRIVATE_ERRORS]: {
          ...state[INIT_DLIGHT_PRIVATE_ERRORS],
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
    case SET_CONVERSION_PATHS:
      return {
        ...state,
        [API_GET_CONVERSION_PATHS]: {
          ...state[API_GET_CONVERSION_PATHS],
          [channel]: {
            ...state[API_GET_CONVERSION_PATHS][channel],
            [chainTicker]: null,
          },
        },
      };
    case SET_WITHDRAW_DESTINATIONS:
      return {
        ...state,
        [API_GET_WITHDRAW_DESTINATIONS]: {
          ...state[API_GET_WITHDRAW_DESTINATIONS],
          [channel]: {
            ...state[API_GET_WITHDRAW_DESTINATIONS][channel],
            [chainTicker]: null,
          },
        },
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
    case SET_SERVICE_ACCOUNT:
      return {
        ...state,
        [API_GET_SERVICE_ACCOUNT]: {
          ...state[API_GET_SERVICE_ACCOUNT],
          [channel]: null
        }
      };
    case SET_SERVICE_PAYMENT_METHODS:
      return {
        ...state,
        [API_GET_SERVICE_PAYMENT_METHODS]: {
          ...state[API_GET_SERVICE_PAYMENT_METHODS],
          [channel]: null
        }
      }
    case SET_SERVICE_TRANSFERS:
      return {
        ...state,
        [API_GET_SERVICE_TRANSFERS]: {
          ...state[API_GET_SERVICE_TRANSFERS],
          [channel]: null
        }
      }
    case SET_SERVICE_RATES:
      return {
        ...state,
        [API_GET_SERVICE_RATES]: {
          ...state[API_GET_SERVICE_RATES],
          [channel]: null
        }
      }
    default:
      return state;
  }
}