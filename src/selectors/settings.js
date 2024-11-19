import { createSelector } from 'reselect';

const addressBlocklist = state =>
  state.settings.generalWalletSettings.addressBlocklist
    ? state.settings.generalWalletSettings.addressBlocklist
    : [];

const vrpcOverrides = state =>
  state.settings.generalWalletSettings.vrpcOverrides
    ? state.settings.generalWalletSettings.vrpcOverrides
    : {};

export const selectAddressBlocklist = createSelector(
  [addressBlocklist],
  (_addressBlocklist) => {
    return _addressBlocklist
  }
);

export const selectVrpcOverrides = createSelector(
  [vrpcOverrides],
  (_vrpcOverrides) => {
    return _vrpcOverrides
  }
);