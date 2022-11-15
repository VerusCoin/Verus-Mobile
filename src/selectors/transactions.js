import { createSelector } from 'reselect';
import { 
  API_GET_TRANSACTIONS,
} from '../utils/constants/intervalConstants';


const selectTransactionsReducerState = (state) => state.ledger.transactions;

const selectActiveCoin = (state) => state.coins.activeCoin;

const selectSubWallets = (state) => state.coinMenus.activeSubWallets

const selectErrors = (state) => state.errors;

export const selectTransactions = createSelector(
  [selectTransactionsReducerState, selectActiveCoin, selectErrors, selectSubWallets],
  (transactions, activeCoin, errors, activeSubWallets) => {
    const activeCoinId = activeCoin.id
    const channel =
      activeSubWallets[activeCoinId] != null
        ? activeSubWallets[activeCoinId].api_channels[API_GET_TRANSACTIONS]
        : null;

    return {
      results:
        channel != null && transactions[channel] != null
          ? transactions[channel][activeCoinId]
          : null,
      errors:
        channel != null && errors[API_GET_TRANSACTIONS][channel] != null
          ? errors[API_GET_TRANSACTIONS][channel][activeCoinId]
          : null,
    };
  }
);

export default selectTransactions;
