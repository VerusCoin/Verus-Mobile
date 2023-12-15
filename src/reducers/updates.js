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
  ERROR_SERVICE_PAYMENT_METHODS,
  SET_SERVICE_TRANSFERS,
  ERROR_SERVICE_TRANSFERS,
  SET_SERVICE_RATES,
  ERROR_SERVICE_RATES,
  SET_CONVERSION_PATHS,
  ERROR_CONVERSION_PATHS,
  SET_WITHDRAW_DESTINATIONS,
  ERROR_WITHDRAW_DESTINATIONS,
  SET_DEPOSIT_SOURCES,
  ERROR_DEPOSIT_SOURCES,
  SET_PENDING_DEPOSITS,
  ERROR_PENDING_DEPOSITS,
  SET_LINKED_IDENTITIES,
  ERROR_LINKED_IDENTITIES,
  SET_SERVICE_NOTIFICATIONS,
  ERROR_SERVICE_NOTIFICATIONS,
} from "../utils/constants/storeType";
import {
  API_GET_BALANCES,
  API_GET_TRANSACTIONS,
  API_GET_INFO,
  API_GET_FIATPRICE,
  API_GET_SERVICE_ACCOUNT,
  API_GET_SERVICE_PAYMENT_METHODS,
  API_GET_SERVICE_TRANSFERS,
  API_GET_SERVICE_RATES,
  API_GET_CONVERSION_PATHS,
  API_GET_WITHDRAW_DESTINATIONS,
  API_GET_DEPOSIT_SOURCES,
  API_GET_PENDING_DEPOSITS,
  API_GET_LINKED_IDENTITIES,
  API_GET_NOTIFICATIONS
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
    case SET_CONVERSION_PATHS:
    case ERROR_CONVERSION_PATHS:
      return {
        ...state,
        coinUpdateTracker: {
          ...state.coinUpdateTracker,
          [chainTicker]: {
            ...state.coinUpdateTracker[chainTicker],
            [API_GET_CONVERSION_PATHS]: state.coinUpdateTracker[chainTicker]
              ? {
                  ...state.coinUpdateTracker[chainTicker][
                    API_GET_CONVERSION_PATHS
                  ],
                  busy: {
                    ...state.coinUpdateTracker[chainTicker][
                      API_GET_CONVERSION_PATHS
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
    case SET_WITHDRAW_DESTINATIONS:
    case ERROR_WITHDRAW_DESTINATIONS:
      return {
        ...state,
        coinUpdateTracker: {
          ...state.coinUpdateTracker,
          [chainTicker]: {
            ...state.coinUpdateTracker[chainTicker],
            [API_GET_WITHDRAW_DESTINATIONS]: state.coinUpdateTracker[chainTicker]
              ? {
                  ...state.coinUpdateTracker[chainTicker][
                    API_GET_WITHDRAW_DESTINATIONS
                  ],
                  busy: {
                    ...state.coinUpdateTracker[chainTicker][
                      API_GET_WITHDRAW_DESTINATIONS
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
    case SET_DEPOSIT_SOURCES:
    case ERROR_DEPOSIT_SOURCES:
      return {
        ...state,
        coinUpdateTracker: {
          ...state.coinUpdateTracker,
          [chainTicker]: {
            ...state.coinUpdateTracker[chainTicker],
            [API_GET_DEPOSIT_SOURCES]: state.coinUpdateTracker[chainTicker]
              ? {
                  ...state.coinUpdateTracker[chainTicker][
                    API_GET_DEPOSIT_SOURCES
                  ],
                  busy: {
                    ...state.coinUpdateTracker[chainTicker][
                      API_GET_DEPOSIT_SOURCES
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
    case SET_PENDING_DEPOSITS:
    case ERROR_PENDING_DEPOSITS:
      return {
        ...state,
        coinUpdateTracker: {
          ...state.coinUpdateTracker,
          [chainTicker]: {
            ...state.coinUpdateTracker[chainTicker],
            [API_GET_PENDING_DEPOSITS]: state.coinUpdateTracker[chainTicker]
              ? {
                  ...state.coinUpdateTracker[chainTicker][
                    API_GET_PENDING_DEPOSITS
                  ],
                  busy: {
                    ...state.coinUpdateTracker[chainTicker][
                      API_GET_PENDING_DEPOSITS
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
    case SET_LINKED_IDENTITIES:
    case ERROR_LINKED_IDENTITIES:
      return {
        ...state,
        coinUpdateTracker: {
          ...state.coinUpdateTracker,
          [chainTicker]: {
            ...state.coinUpdateTracker[chainTicker],
            [API_GET_LINKED_IDENTITIES]: state.coinUpdateTracker[chainTicker]
              ? {
                  ...state.coinUpdateTracker[chainTicker][
                    API_GET_LINKED_IDENTITIES
                  ],
                  busy: {
                    ...state.coinUpdateTracker[chainTicker][
                      API_GET_LINKED_IDENTITIES
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
    case SET_SERVICE_TRANSFERS:
    case ERROR_SERVICE_TRANSFERS:
      return {
        ...state,
        serviceUpdateTracker: {
          ...state.serviceUpdateTracker,
          [API_GET_SERVICE_TRANSFERS]: {
            ...state.serviceUpdateTracker[
              API_GET_SERVICE_TRANSFERS
            ],
            busy: {
              ...state.serviceUpdateTracker[
                API_GET_SERVICE_TRANSFERS
              ].busy,
              [channel]: false,
            },
          }
        },
      };
    case SET_SERVICE_RATES:
    case ERROR_SERVICE_RATES:
      return {
        ...state,
        serviceUpdateTracker: {
          ...state.serviceUpdateTracker,
          [API_GET_SERVICE_RATES]: {
            ...state.serviceUpdateTracker[
              API_GET_SERVICE_RATES
            ],
            busy: {
              ...state.serviceUpdateTracker[
                API_GET_SERVICE_RATES
              ].busy,
              [channel]: false,
            },
          }
        },
      };
      case SET_SERVICE_NOTIFICATIONS:
      case ERROR_SERVICE_NOTIFICATIONS:
          return {
            ...state,
            serviceUpdateTracker: {
              ...state.serviceUpdateTracker,
              [API_GET_NOTIFICATIONS]: {
                ...state.serviceUpdateTracker[
                  API_GET_NOTIFICATIONS
                ],
                busy: {
                  ...state.serviceUpdateTracker[
                    API_GET_NOTIFICATIONS
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