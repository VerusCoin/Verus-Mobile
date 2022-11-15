import {
  ERROR_WITHDRAW_DESTINATIONS,
  SET_WITHDRAW_DESTINATIONS,
} from "../../../../utils/constants/storeType";
import { WYRE_SERVICE } from "../../../../utils/constants/intervalConstants";
import { updateLedgerValue } from "./UpdateLedgerValue";
import { updateWyreWithdrawalDestinations } from "./wyre/updates";

const fetchChannels = () => {
  return {
    [WYRE_SERVICE]: coinObj => updateWyreWithdrawalDestinations(coinObj),
  }
};

/**
 * Fetches the appropriate data from the store for the specified channel's withdraw destination info
 * update and dispatches a withdraw destination update or error action to the store.
 * @param {Object} state Reference to redux store state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} chainTicker Chain ticker id for chain to fetch balances for
 */
export const updateWithdrawDestinations = (state, dispatch, channels, chainTicker) =>
  updateLedgerValue(
    state,
    dispatch,
    channels,
    chainTicker,
    SET_WITHDRAW_DESTINATIONS,
    ERROR_WITHDRAW_DESTINATIONS,
    fetchChannels
  );
