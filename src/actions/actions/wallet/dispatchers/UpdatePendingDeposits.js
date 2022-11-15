import {
  ERROR_PENDING_DEPOSITS,
  SET_PENDING_DEPOSITS,
} from "../../../../utils/constants/storeType";
import { WYRE_SERVICE } from "../../../../utils/constants/intervalConstants";
import { updateLedgerValue } from "./UpdateLedgerValue";
import { updateWyrePendingDeposits } from "./wyre/updates";

const fetchChannels = () => {
  return {
    [WYRE_SERVICE]: (coinObj) => updateWyrePendingDeposits(coinObj),
  };
};

/**
 * Fetches the appropriate data from the store for the specified channel's deposit info
 * update and dispatches a deposit update or error action to the store.
 * @param {Object} state Reference to redux store state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} chainTicker Chain ticker id for chain to fetch balances for
 */
export const updatePendingDeposits = (state, dispatch, channels, chainTicker) =>
  updateLedgerValue(
    state,
    dispatch,
    channels,
    chainTicker,
    SET_PENDING_DEPOSITS,
    ERROR_PENDING_DEPOSITS,
    fetchChannels
  );
