import { createSelector } from 'reselect';
import { 
  API_GET_FIATPRICE,
} from '../utils/constants/intervalConstants';


const selectRatesReducerState = (state) => state.ledger.rates;

const selectActiveCoin = (state) => state.coins.activeCoin;

const selectSubWallets = (state) => state.coinMenus.activeSubWallets

const selectErrors = (state) => state.errors;

export const selectRates = createSelector(
  [selectRatesReducerState, selectActiveCoin, selectErrors, selectSubWallets],
  (rates, activeCoin, errors, activeSubWallets) => {
    const activeCoinId = activeCoin.id
    const channel =
      activeSubWallets[activeCoinId] != null
        ? activeSubWallets[activeCoinId].api_channels[API_GET_FIATPRICE]
        : null;

    return {
      results: channel != null ? rates[channel][activeCoinId] : null,
      errors: channel != null ? errors[API_GET_FIATPRICE][channel][activeCoinId] : null,
    };
  }
);

export default selectRates;
