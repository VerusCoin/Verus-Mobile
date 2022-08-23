import {
  ERROR_DEPOSIT_SOURCES,
  SET_DEPOSIT_SOURCES,
} from "../../../../utils/constants/storeType";
import { WYRE_SERVICE } from "../../../../utils/constants/intervalConstants";
import { updateLedgerValue } from "./UpdateLedgerValue";
import { updateWyreDepositSources } from "./wyre/updates";

const fetchChannels = (activeUser) => {
  return {
    [WYRE_SERVICE]: (coinObj) => updateWyreDepositSources(coinObj)
  }
};

/**
 * Fetches the appropriate data from the store for the specified channel's deposit source info
 * update and dispatches a deposit source update or error action to the store.
 * @param {Object} state Reference to redux store state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} chainTicker Chain ticker id for chain to fetch balances for
 */
export const updateDepositSources = (state, dispatch, channels, chainTicker) =>
  updateLedgerValue(
    state,
    dispatch,
    channels,
    chainTicker,
    SET_DEPOSIT_SOURCES,
    ERROR_DEPOSIT_SOURCES,
    fetchChannels
  );
