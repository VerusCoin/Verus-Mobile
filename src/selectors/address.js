import { createSelector } from 'reselect';
import { API_GET_ADDRESSES } from '../utils/constants/intervalConstants';

const selectActiveAccount = (state) => state.authentication.activeAccount;

const selectActiveCoin = (state) => state.coins.activeCoin;

const selectSubWallets = (state) => state.coinMenus.activeSubWallets

export const selectAddresses = createSelector(
  [selectActiveAccount, selectActiveCoin, selectSubWallets],
  (activeAccount, activeCoin, activeSubWallets) => {
    const activeCoinId = activeCoin.id
    const channel =
      activeSubWallets[activeCoinId] != null
        ? activeSubWallets[activeCoinId].api_channels[API_GET_ADDRESSES]
        : null;

    if (
      activeAccount.keys[activeCoinId] != null &&
      activeAccount.keys[activeCoinId][channel] != null &&
      activeAccount.keys[activeCoinId][channel].addresses.length > 0
    ) {
      return {
        results: activeAccount.keys[activeCoinId][channel].addresses,
        errors: null
      }
    } else {
      return {
        results: null,
        errors: new Error("No address found for " + activeCoinId)
      }
    }
  }
);

export default selectAddresses;
