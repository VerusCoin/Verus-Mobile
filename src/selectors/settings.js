import { createSelector } from 'reselect';

const getAddressBlocklistFromServer = state =>
  state.settings.generalWalletSettings.addressBlocklist
    ? state.settings.generalWalletSettings.addressBlocklist
    : [];

export const selectAddressBlocklist = createSelector(
  [getAddressBlocklistFromServer],
  (addressBlocklist) => {
    return addressBlocklist
  }
);

export default selectAddressBlocklist;
