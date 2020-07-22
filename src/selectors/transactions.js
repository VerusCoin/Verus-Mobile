import { createSelector } from 'reselect';
import { 
  ELECTRUM,
  DLIGHT,
  API_GET_TRANSACTIONS,
} from '../utils/constants/intervalConstants';


const selectTransactionsReducerState = (state) => state.ledger.transactions;

const selectActiveCoinId = (state) => state.coins.activeCoin.id;

const selectErrors = (state) => state.errors;

export const selectTransactions = createSelector(
  [selectTransactionsReducerState, selectActiveCoinId, selectErrors],
  (transactions, activeCoinId, errors) => ({
    public: transactions[ELECTRUM][activeCoinId],
    private: transactions[DLIGHT][activeCoinId],
    errors: {
      public: errors[API_GET_TRANSACTIONS][ELECTRUM][activeCoinId],
      private: errors[API_GET_TRANSACTIONS][DLIGHT][activeCoinId],
    },
  }),
);

export default selectTransactions;
