import { getZTransactions } from '../../../../utils/api/channels/dlight/callCreators'
import { getParsedTransactionList } from '../../../../utils/api/channels/electrum/callCreators'
import { ERROR_TRANSACTIONS, SET_TRANSACTIONS } from '../../../../utils/constants/storeType'
import { DLIGHT, ELECTRUM, ETH, ERC20 } from '../../../../utils/constants/intervalConstants'
import { standardizeDlightTxObj } from '../../../../utils/standardization/standardizeTxObj'
import { updateLedgerValue } from './UpdateLedgerValue'
import { getStandardEthTransactions } from '../../../../utils/api/channels/eth/callCreator'
import { getStandardErc20Transactions } from '../../../../utils/api/channels/erc20/callCreator'

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
  [ETH]: async (activeUser, coinObj) => {
    if (
      activeUser.keys[coinObj.id] != null &&
      activeUser.keys[coinObj.id][ETH] != null &&
      activeUser.keys[coinObj.id][ETH].addresses.length > 0
    ) {
      return {
        chainTicker: coinObj.id,
        channel: ETH,
        header: {},
        body: await getStandardEthTransactions(
          activeUser.keys[coinObj.id][ETH].addresses[0]
        ),
      };
    } else {
      throw new Error(
        "updateTransactions.js: Fatal mismatch error, " +
          activeUser.id +
          " user keys for active coin " +
          coinObj.id +
          " not found!"
      );
    }
  },
  [ERC20]: async (activeUser, coinObj) => {
    if (
      activeUser.keys[coinObj.id] != null &&
      activeUser.keys[coinObj.id][ERC20] != null &&
      activeUser.keys[coinObj.id][ERC20].addresses.length > 0
    ) {
      return {
        chainTicker: coinObj.id,
        channel: ERC20,
        header: {},
        body: await getStandardErc20Transactions(
          activeUser.keys[coinObj.id][ERC20].addresses[0],
          coinObj.contract_address,
          coinObj.decimals
        ),
      };
    } else {
      throw new Error(
        "updateTransactions.js: Fatal mismatch error, " +
          activeUser.id +
          " user keys for active coin " +
          coinObj.id +
          " not found!"
      );
    }
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