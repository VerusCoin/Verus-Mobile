const actionToUi = (action) => {
  switch (action.type) {
    case 'CREATE_WYRE_ACCOUNT':
    case 'CREATE_WYRE_ACCOUNT_RESPONSE':
      return 'createAccount';
    case 'GET_WYRE_ACCOUNT':
    case 'GET_WYRE_ACCOUNT_RESPONSE':
      return 'getAccount';
    case 'PUT_WYRE_ACCOUNT':
    case 'PUT_WYRE_ACCOUNT_RESPONSE':
      return 'putAccount';
    case 'GET_WYRE_CONFIG':
    case 'GET_WYRE_CONFIG_RESPONSE':
      return 'getConfig';
    case 'CREATE_WYRE_PAYMENT':
    case 'CREATE_WYRE_PAYMENT_RESPONSE':
      return 'createPayment';
    case 'GET_EXCHANGE_RATES':
    case 'GET_EXCHANGE_RATES_RESPONSE':
      return 'getExchangeRates';
    case 'GET_TRANSACTION_HISTORY':
    case 'GET_TRANSACTION_HISTORY_RESPONSE':
      return 'getTransactionHistory'
    default:
      return '';
  }
};

const denormalizeProfileFields = (profileFields) => {
  if (!profileFields) return {};
  return profileFields.reduce((obj, item) => {
    // eslint-disable-next-line no-param-reassign
    obj[item.fieldId] = item;
    return obj;
  }, {});
};

const isFetching = (state, type, value) => ({
  ...state,
  [type]: {
    isFetching: value,
  }
});

const account = (state, action) => {
  if (!action.payload.account) return state;
  return {
    ...action.payload.account,
    denormalizedProfileFields: denormalizeProfileFields(action.payload.account.profileFields),
  };
};

const wyre = (state, action) => {
  console.log(action)
  switch (action.type) {
    case 'CREATE_WYRE_ACCOUNT':
    case 'GET_WYRE_ACCOUNT':
    case 'CREATE_WYRE_PAYMENT':
    case 'PUT_WYRE_ACCOUNT':
      return {
        ...state,
        ui: isFetching(state.ui, actionToUi(action), true),
      };
    case 'CREATE_WYRE_ACCOUNT_RESPONSE':
    case 'CREATE_WYRE_PAYMENT_RESPONSE':
      return {
        ...state,
        ui: isFetching(state.ui, actionToUi(action), false),
      };
    case 'GET_WYRE_ACCOUNT_RESPONSE':
    case 'PUT_WYRE_ACCOUNT_RESPONSE':
      return {
        ...state,
        account: account(state.account, action),
        ui: isFetching(state.ui, actionToUi(action), false),
      };
    case 'GET_WYRE_CONFIG':
      return {
        ...state,
        ui: isFetching(state.ui, actionToUi(action), false),
        config: {},
      };
    case 'GET_WYRE_CONFIG_RESPONSE':
      return {
        ...state,
        ui: isFetching(state.ui, actionToUi(action), false),
        config: {
          ...action.payload.config
        },
      };
    case 'GET_EXCHANGE_RATES':
        return {
          ...state,
          ui: isFetching(state.ui, actionToUi(action), true),
          rates: {}
        }
    case 'GET_EXCHANGE_RATES_RESPONSE':
      return {
        ...state,
        ui: isFetching(state.ui, actionToUi(action), false),
        rates: {
          ...action.payload.rates
        }
      }
    case 'GET_TRANSACTION_HISTORY':
      return {
        ...state,
        ui: isFetching(state.ui, actionToUi(action), true),
        history: [],
      }
    case 'GET_TRANSACTION_HISTORY_RESPONSE':
      return {
        ...state,
        ui: isFetching(state.ui, actionToUi(action), false),
        history: action.payload.history,
      }
    default:
      return state;
  }
};



export const paymentMethods = (state = {
  wyre: {
    account: {
      denormalizedProfileFields: {},
    },
    config: {},
    ui: {
      createAccount: {
        isFetching: false,
      },
      getAccount: {
        isFetching: false,
      },
      putAccount: {
        isFetching: false,
      },
      getConfig: {
        isFetching: false,
      },
      createPayment: {
        isFetching: false,
      },
      getExchangeRates: {
        isFetching: false,
      },
      getTransactionHistory: {
        isFetching: false,
      }
    },
    rates: {},
  }
}, action) => {
  switch (action.type) {
    case 'CREATE_WYRE_ACCOUNT':
    case 'CREATE_WYRE_ACCOUNT_RESPONSE':
    case 'GET_WYRE_ACCOUNT':
    case 'GET_WYRE_ACCOUNT_RESPONSE':
    case 'PUT_WYRE_ACCOUNT':
    case 'PUT_WYRE_ACCOUNT_RESPONSE':
    case 'GET_WYRE_CONFIG':
    case 'GET_WYRE_CONFIG_RESPONSE':
    case 'CREATE_WYRE_PAYMENT':
    case 'CREATE_WYRE_PAYMENT_RESPONSE':
    case 'GET_EXCHANGE_RATES':
    case 'GET_EXCHANGE_RATES_RESPONSE':
    case 'GET_TRANSACTION_HISTORY':
    case 'GET_TRANSACTION_HISTORY_RESPONSE':
      return {
        ...state,
        wyre: wyre(state.wyre, action),
      };
    default:
      return state;
  }
};

export default paymentMethods;
