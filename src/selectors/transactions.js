import { createSelector } from 'reselect';
import { 
  ELECTRUM,
  DLIGHT,
  API_GET_TRANSACTIONS,
} from '../utils/constants/intervalConstants';


const selectTransactionsReducerState = (state) => state.ledger.transactions;

const selectActiveCoin = (state) => state.coins.activeCoin;

const selectErrors = (state) => state.errors;

export const selectTransactions = createSelector(
  [selectTransactionsReducerState, selectActiveCoin, selectErrors],
  (transactions, activeCoin, errors) => {
    const activeCoinId = activeCoin.id
    const mainChannel = activeCoin.dominant_channel ? activeCoin.dominant_channel : ELECTRUM

    return {
      public: transactions[mainChannel][activeCoinId],
      private: transactions[DLIGHT][activeCoinId],
      errors: {
        public: errors[API_GET_TRANSACTIONS][mainChannel][activeCoinId],
        private: errors[API_GET_TRANSACTIONS][DLIGHT][activeCoinId],
      },
    };
  }
);

export default selectTransactions;
