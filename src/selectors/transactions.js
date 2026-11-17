import { createSelector } from 'reselect';
import { 
  API_GET_TRANSACTIONS,
} from '../utils/constants/intervalConstants';


const selectTransactionsReducerState = state => state.ledger.transactions;

const selectActiveCoin = state => state.coins.activeCoin;

const selectSubWallets = state => state.coinMenus.activeSubWallets;

const selectErrors = state => state.errors;

const selectCoinUpdateTracker = state => state.updates.coinUpdateTracker;

export const selectTransactions = createSelector(
  [
    selectTransactionsReducerState,
    selectActiveCoin,
    selectErrors,
    selectSubWallets,
    selectCoinUpdateTracker,
  ],
  (transactions, activeCoin, errors, activeSubWallets, coinUpdateTracker) => {
    const activeCoinId = activeCoin.id;
    const channel =
      activeSubWallets[activeCoinId] != null
        ? activeSubWallets[activeCoinId].api_channels?.[API_GET_TRANSACTIONS]
        : null;
    const results =
      channel != null && transactions[channel] != null
        ? transactions[channel][activeCoinId]
        : null;
    const transactionError =
      channel != null && errors[API_GET_TRANSACTIONS]?.[channel] != null
        ? errors[API_GET_TRANSACTIONS][channel][activeCoinId]
        : null;
    const isLoading =
      channel != null &&
      coinUpdateTracker[activeCoinId]?.[API_GET_TRANSACTIONS]?.busy?.[
        channel
      ] === true;

    return {
      channel,
      errors: transactionError,
      isLoading,
      isUnresolved:
        channel != null && results == null && transactionError == null,
      results,
    };
  },
);

export default selectTransactions;
