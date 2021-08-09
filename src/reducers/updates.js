/*
  This reducer contains the API fetch update state to 
  manage data retreival from the API efficiently.
*/
import {
  SET_COIN_UPDATE_DATA,
  EXPIRE_COIN_DATA,
  RENEW_COIN_DATA,
  SET_COIN_UPDATE_EXPIRED_ID,
  SET_COIN_EXPIRE_ID,
  CLEAR_COIN_UPDATE_EXPIRED_ID,
  CLEAR_COIN_EXPIRE_ID,
  OCCUPY_COIN_API_CALL,
  ENABLE_COIN_API_CALL,
  DISABLE_COIN_API_CALL,
  SET_BALANCES,
  ERROR_BALANCES,
  SET_TRANSACTIONS,
  ERROR_TRANSACTIONS,
  SET_INFO,
  ERROR_INFO,
  SET_RATES,
  ERROR_RATES,
  SET_SERVICE_UPDATE_DATA,
  OCCUPY_SERVICE_API_CALL,
  SET_SERVICE_EXPIRE_ID,
  CLEAR_SERVICE_EXPIRE_ID,
  SET_SERVICE_UPDATE_EXPIRED_ID,
  CLEAR_SERVICE_UPDATE_EXPIRED_ID,
  SET_SERVICE_ACCOUNT,
  ERROR_SERVICE_ACCOUNT,
  EXPIRE_SERVICE_DATA,
  RENEW_SERVICE_DATA,
  SET_SERVICE_PAYMENT_METHODS,
  ERROR_SERVICE_PAYMENT_METHODS
} from "../utils/constants/storeType";
import {
  API_GET_BALANCES,
  API_GET_TRANSACTIONS,
  API_GET_INFO,
  API_GET_FIATPRICE,
  API_GET_SERVICE_ACCOUNT,
  API_GET_SERVICE_PAYMENT_METHODS,
} from "../utils/constants/intervalConstants";

export const updates = (state = {
  coinUpdateTracker: {},
  coinUpdateIntervals: {},
  serviceUpdateTracker: {},
  serviceUpdateIntervals: {}
}, action) => {
  let { chainTicker, channel, dataType, channels, error } = action.payload || {}
  if (chainTicker == null && error) {
    channel = error.channel
    chainTicker = error.chainTicker
  }

  switch (action.type) {
    case SET_COIN_UPDATE_DATA:
      return {
        ...state,
        coinUpdateIntervals: {...state.coinUpdateIntervals, [action.chainTicker]: action.updateIntervalData},
        coinUpdateTracker: {...state.coinUpdateTracker, [action.chainTicker]: action.updateTrackingData},
      };
    case SET_SERVICE_UPDATE_DATA:
      return {
        ...state,
        serviceUpdateTracker: action.updateTrackingData,
        serviceUpdateIntervals: action.updateIntervalData
      };
    case EXPIRE_COIN_DATA: 
      return {
        ...state,
        coinUpdateTracker: {
          ...state.coinUpdateTracker, 
          [action.chainTicker]: {
            ...state.coinUpdateTracker[action.chainTicker], 
            [action.dataType]: {
              ...state.coinUpdateTracker[action.chainTicker][action.dataType],
              needs_update: true
            }}}
      }
    case RENEW_COIN_DATA: 
      return {
        ...state,
        coinUpdateTracker: {
          ...state.coinUpdateTracker, 
          [action.chainTicker]: {
            ...state.coinUpdateTracker[action.chainTicker], 
            [action.dataType]: {
              ...state.coinUpdateTracker[action.chainTicker][action.dataType],
              needs_update: false
            }}}
      }
    case EXPIRE_SERVICE_DATA: 
      return {
        ...state,
        serviceUpdateTracker: {
          ...state.serviceUpdateTracker,
          [action.dataType]: {
            ...state.serviceUpdateTracker[action.dataType],
            needs_update: true,
          },
        },
      };
    case RENEW_SERVICE_DATA: 
      return {
        ...state,
        serviceUpdateTracker: {
          ...state.serviceUpdateTracker,
          [action.dataType]: {
            ...state.serviceUpdateTracker[action.dataType],
            needs_update: false,
          },
        },
      };
    case SET_BALANCES:
    case ERROR_BALANCES:
      return {
        ...state,
        coinUpdateTracker: {
          ...state.coinUpdateTracker,
          [chainTicker]: {
            ...state.coinUpdateTracker[chainTicker],
            [API_GET_BALANCES]: state.coinUpdateTracker[chainTicker]
              ? {
                  ...state.coinUpdateTracker[chainTicker][
                    API_GET_BALANCES
                  ],
                  busy: {
                    ...state.coinUpdateTracker[chainTicker][
                      API_GET_BALANCES
                    ].busy,
                    [channel]: false,
                  },
                }
              : {
                  busy: {
                    [channel]: false,
                  },
                },
          },
        },
      };
    case SET_TRANSACTIONS:
    case ERROR_TRANSACTIONS:
      return {
        ...state,
        coinUpdateTracker: {
          ...state.coinUpdateTracker,
          [chainTicker]: {
            ...state.coinUpdateTracker[chainTicker],
            [API_GET_TRANSACTIONS]: state.coinUpdateTracker[chainTicker]
              ? {
                  ...state.coinUpdateTracker[chainTicker][
                    API_GET_TRANSACTIONS
                  ],
                  busy: {
                    ...state.coinUpdateTracker[chainTicker][
                      API_GET_TRANSACTIONS
                    ].busy,
                    [channel]: false,
                  },
                }
              : {
                  busy: {
                    [channel]: false,
                  },
                },
          },
        },
      };
    case SET_INFO:
    case ERROR_INFO:
      return {
        ...state,
        coinUpdateTracker: {
          ...state.coinUpdateTracker,
          [chainTicker]: {
            ...state.coinUpdateTracker[chainTicker],
            [API_GET_INFO]: state.coinUpdateTracker[chainTicker]
              ? {
                  ...state.coinUpdateTracker[chainTicker][
                    API_GET_INFO
                  ],
                  busy: {
                    ...state.coinUpdateTracker[chainTicker][
                      API_GET_INFO
                    ].busy,
                    [channel]: false,
                  },
                }
              : {
                  busy: {
                    [channel]: false,
                  },
                },
          },
        },
      };
    case SET_RATES:
    case ERROR_RATES:
      return {
        ...state,
        coinUpdateTracker: {
          ...state.coinUpdateTracker,
          [chainTicker]: {
            ...state.coinUpdateTracker[chainTicker],
            [API_GET_FIATPRICE]: state.coinUpdateTracker[chainTicker]
              ? {
                  ...state.coinUpdateTracker[chainTicker][
                    API_GET_FIATPRICE
                  ],
                  busy: {
                    ...state.coinUpdateTracker[chainTicker][
                      API_GET_FIATPRICE
                    ].busy,
                    [channel]: false,
                  },
                }
              : {
                  busy: {
                    [channel]: false,
                  },
                },
          },
        },
      };
    case SET_SERVICE_ACCOUNT:
    case ERROR_SERVICE_ACCOUNT:
      return {
        ...state,
        serviceUpdateTracker: {
          ...state.serviceUpdateTracker,
          [API_GET_SERVICE_ACCOUNT]: {
            ...state.serviceUpdateTracker[
              API_GET_SERVICE_ACCOUNT
            ],
            busy: {
              ...state.serviceUpdateTracker[
                API_GET_SERVICE_ACCOUNT
              ].busy,
              [channel]: false,
            },
          }
        },
      };
    case SET_SERVICE_PAYMENT_METHODS:
    case ERROR_SERVICE_PAYMENT_METHODS:
      return {
        ...state,
        serviceUpdateTracker: {
          ...state.serviceUpdateTracker,
          [API_GET_SERVICE_PAYMENT_METHODS]: {
            ...state.serviceUpdateTracker[
              API_GET_SERVICE_PAYMENT_METHODS
            ],
            busy: {
              ...state.serviceUpdateTracker[
                API_GET_SERVICE_PAYMENT_METHODS
              ].busy,
              [channel]: false,
            },
          }
        },
      };
    case OCCUPY_COIN_API_CALL: 
      return {
        ...state,
        coinUpdateTracker: {
          ...state.coinUpdateTracker, 
          [chainTicker]: {
            ...state.coinUpdateTracker[chainTicker], 
            [dataType]: {
              ...state.coinUpdateTracker[chainTicker][dataType],
              busy: {
                ...state.coinUpdateTracker[chainTicker][API_GET_FIATPRICE].busy,
                ...channels
              }
            }}}
      }
    case OCCUPY_SERVICE_API_CALL: 
      return {
        ...state,
        serviceUpdateTracker: {
          ...state.serviceUpdateTracker,
          [action.dataType]: {
            ...state.serviceUpdateTracker[action.dataType],
            busy: true
          }
        }
      }
    case ENABLE_COIN_API_CALL: 
      return {
        ...state,
        coinUpdateTracker: {
          ...state.coinUpdateTracker, 
          [action.chainTicker]: {
            ...state.coinUpdateTracker[action.chainTicker], 
            [action.dataType]: {
              ...state.coinUpdateTracker[action.chainTicker][action.dataType],
              update_enabled: true
            }}}
      }
    case DISABLE_COIN_API_CALL: 
      return {
        ...state,
        coinUpdateTracker: {
          ...state.coinUpdateTracker, 
          [action.chainTicker]: {
            ...state.coinUpdateTracker[action.chainTicker], 
            [action.dataType]: {
              ...state.coinUpdateTracker[action.chainTicker][action.dataType],
              update_enabled: false
            }}}
      }
    case SET_COIN_EXPIRE_ID: 
      return {
        ...state,
        coinUpdateIntervals: {
          ...state.coinUpdateIntervals, 
          [action.chainTicker]: {
            ...state.coinUpdateIntervals[action.chainTicker], 
            [action.dataType]: {
              ...state.coinUpdateIntervals[action.chainTicker][action.dataType],
              expire_id: action.timeoutId
            }}}
      }
    case SET_SERVICE_EXPIRE_ID: 
      return {
        ...state,
        serviceUpdateIntervals: {
          ...state.serviceUpdateIntervals,
          [action.dataType]: {
            ...state.serviceUpdateIntervals[action.dataType],
            expire_id: action.timeoutId,
          },
        },
      };
    case CLEAR_COIN_EXPIRE_ID: 
      return {
        ...state,
        coinUpdateIntervals: {
          ...state.coinUpdateIntervals, 
          [action.chainTicker]: {
            ...state.coinUpdateIntervals[action.chainTicker], 
            [action.dataType]: {
              ...state.coinUpdateIntervals[action.chainTicker][action.dataType],
              expire_id: null
            }}}
      }
    case CLEAR_SERVICE_EXPIRE_ID: 
      return {
        ...state,
        serviceUpdateIntervals: {
          ...state.serviceUpdateIntervals,
          [action.dataType]: {
            ...state.serviceUpdateIntervals[action.dataType],
            expire_id: null,
          },
        },
      };
    case SET_COIN_UPDATE_EXPIRED_ID: 
      return {
        ...state,
        coinUpdateIntervals: {
          ...state.coinUpdateIntervals, 
          [action.chainTicker]: {
            ...state.coinUpdateIntervals[action.chainTicker], 
            [action.dataType]: {
              ...state.coinUpdateIntervals[action.chainTicker][action.dataType],
              update_expired_id: action.intervalId
            }}}
      }
    case SET_SERVICE_UPDATE_EXPIRED_ID: 
      return {
        ...state,
        serviceUpdateIntervals: {
          ...state.serviceUpdateIntervals,
          [action.dataType]: {
            ...state.serviceUpdateIntervals[action.dataType],
            update_expired_id: action.intervalId,
          },
        },
      };
    case CLEAR_COIN_UPDATE_EXPIRED_ID: 
      return {
        ...state,
        coinUpdateIntervals: {
          ...state.coinUpdateIntervals, 
          [action.chainTicker]: {
            ...state.coinUpdateIntervals[action.chainTicker], 
            [action.dataType]: {
              ...state.coinUpdateIntervals[action.chainTicker][action.dataType],
              update_expired_id: null
            }}}
      }
    case CLEAR_SERVICE_UPDATE_EXPIRED_ID: 
      return {
        ...state,
        serviceUpdateIntervals: {
          ...state.serviceUpdateIntervals,
          [action.dataType]: {
            ...state.serviceUpdateIntervals[action.dataType],
            update_expired_id: null,
          },
        },
      };
    default:
      return state;
  }
}