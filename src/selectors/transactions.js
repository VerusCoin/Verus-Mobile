import { createSelector } from 'reselect';
import { 
  ELECTRUM,
  DLIGHT,
} from '../utils/constants/intervalConstants';

// transactions: {
//   public: state.ledger.transactions[ELECTRUM][chainTicker],
//   private: state.ledger.transactions[DLIGHT][chainTicker],
//   errors: {
//     public: state.errors[API_GET_TRANSACTIONS][ELECTRUM][chainTicker],
//     private: state.errors[API_GET_TRANSACTIONS][DLIGHT][chainTicker],
//   }
// },

const selectTransactionsReducerState = (state) => state.ledger.transactions;

const selectActiveCoinId = (state) => state.coins.activeCoin.id;

const selectTransactions = createSelector(
  [selectTransactionsReducerState, selectActiveCoinId],
  (transactions, activeCoinId) => ({
    transactions: {
      public: transactions[ELECTRUM][activeCoinId],
      private: transactions[DLIGHT][activeCoinId],
    },
  }),
);

export default selectTransactions;
