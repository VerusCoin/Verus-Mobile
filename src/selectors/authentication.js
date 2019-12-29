export const selectActiveAccount = (state) => (
  state.authentication.activeAccount
);

export const selectPaymentMethod = (state, method) => {
  const { paymentMethods } = state.authentication.activeAccount;
  return paymentMethods && paymentMethods[method];
};

export const selectWyrePaymentMethod = (state) => (
  selectPaymentMethod(state, 'wyre')
);
