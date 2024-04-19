import { createSelector } from 'reselect';
import { CoinDirectory } from '../utils/CoinData/CoinDirectory';

const selectSubWallet = (state) => state.coinMenus.activeSubWallets[state.coins.activeCoin.id];

export const selectNetworkName = createSelector(
  [selectSubWallet],
  (subwallet) => {
    try {
      return subwallet.network
        ? CoinDirectory.getBasicCoinObj(subwallet.network).display_ticker
        : null;
    } catch (e) {
      return null;
    }
  }
);

export default selectNetworkName;
