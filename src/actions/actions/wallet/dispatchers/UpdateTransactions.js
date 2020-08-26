import { getZTransactions } from '../../../../utils/api/channels/dlight/callCreators'
import { getParsedTransactionList } from '../../../../utils/api/channels/electrum/callCreators'
import { ERROR_TRANSACTIONS, SET_TRANSACTIONS } from '../../../../utils/constants/storeType'
import { DLIGHT, ELECTRUM } from '../../../../utils/constants/intervalConstants'
import { standardizeDlightTxObj } from '../../../../utils/standardization/standardizeTxObj'
import { updateLedgerValue } from './UpdateLedgerValue'

const channelMap = {
  [DLIGHT]: async (activeUser, coinObj) => {
    const zTransactions = await getZTransactions(
      coinObj.id,
      activeUser.accountHash,
      coinObj.proto
    );
    const { result, ...header } = zTransactions;

    return {
      chainTicker: coinObj.id,
      channel: DLIGHT,
      header,
      body: result.map(standardizeDlightTxObj),
    };
  },
  [ELECTRUM]: async (activeUser, coinObj) => {
    const transactions = await getParsedTransactionList(
      coinObj,
      activeUser,
      10
    );
    const { result, ...header } = transactions;

    return {
      chainTicker: coinObj.id,
      channel: ELECTRUM,
      header,
      body: result,
    };
  },
};

/**
 * Fetches the appropriate data from the store for the specified channel's transaction
 * update and dispatches a balance update or error action to the store.
 * @param {Object} state Reference to redux store state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} chainTicker Chain ticker id for chain to fetch balances for
 */
export const updateTransactions = (state, dispatch, channels, chainTicker) =>
  updateLedgerValue(
    state,
    dispatch,
    channels,
    chainTicker,
    SET_TRANSACTIONS,
    ERROR_TRANSACTIONS,
    channelMap
  );