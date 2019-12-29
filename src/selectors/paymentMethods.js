export const selectAccount = (state, method) => (
  state.paymentMethods[method].account
);

export const selectWyreAccount = (state) => (
  selectAccount(state, 'wyre')
);

export const selectWyreAccountField = (state, field) => (
  selectAccount(state, 'wyre').denormalizedProfileFields[field]
);

export const selectAccountIsFetching = (state, action, method) => (
  state.paymentMethods[method].ui[action].isFetching
);

export const selectWyreCreatePaymentIsFetching = (state) => (
  selectAccountIsFetching(state, 'createPayment', 'wyre')
);

export const selectWyreGetAccountIsFetching = (state) => (
  selectAccountIsFetching(state, 'getAccount', 'wyre')
);

export const selectWyreCreateAccountIsFetching = (state) => (
  selectAccountIsFetching(state, 'createAccount', 'wyre')
);

export const selectWyrePutAccountIsFetching = (state) => (
  selectAccountIsFetching(state, 'putAccount', 'wyre')
);

export const selectWyreGetConfigIsFetching = (state) => (
  selectAccountIsFetching(state, 'getConfig', 'wyre')
);

export const selectWyreConfig = (state) => (
  state.paymentMethods.wyre.config
);

export const selectExchangeRates = (state) => (
  state.paymentMethods.wyre.rates.data
);

export const selectExchangeRatesIsFetching = (state) => (
  selectAccountIsFetching(state, 'getExchangeRates', 'wyre')
);

export const selectTransactionHistoryIsFetching = (state) => (
  selectAccountIsFetching(state, 'getTransactionHistory', 'wyre')
);

export const selectTransactionHistory = (state) => (
  state.paymentMethods.wyre.history
);