import { createSelector } from 'reselect';

const getAddressBlocklist = state =>
  state.settings.generalWalletSettings.addressBlocklist
    ? state.settings.generalWalletSettings.addressBlocklist
    : [];

export const selectAddressBlocklist = createSelector(
  [getAddressBlocklist],
  (addressBlocklist) => {
    return addressBlocklist
  }
);

export default selectAddressBlocklist;
