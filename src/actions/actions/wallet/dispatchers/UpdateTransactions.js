import { ERROR_TRANSACTIONS, SET_TRANSACTIONS } from '../../../../utils/constants/storeType'
import { DLIGHT_PRIVATE, ELECTRUM, ETH, ERC20, WYRE_SERVICE } from '../../../../utils/constants/intervalConstants'
import { updateLedgerValue } from './UpdateLedgerValue'
import { updateDlightTransactions } from './dlight/updates'
import { updateElectrumTransactions } from './electrum/updates'
import { updateErc20Transactions } from './erc20/updates'
import { updateEthTransactions } from './eth/updates'
import { updateWyreTransactions } from './wyre/updates'

const fetchChannels = activeUser => {
  return {
    [DLIGHT_PRIVATE]: coinObj => updateDlightTransactions(activeUser, coinObj),
    [ELECTRUM]: coinObj => updateElectrumTransactions(activeUser, coinObj),
    [ETH]: coinObj => updateEthTransactions(activeUser, coinObj),
    [ERC20]: coinObj => updateErc20Transactions(activeUser, coinObj),
    [WYRE_SERVICE]: coinObj => updateWyreTransactions(coinObj),
  };
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
    fetchChannels
  );