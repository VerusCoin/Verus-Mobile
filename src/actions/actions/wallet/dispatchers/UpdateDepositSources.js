import {
  ERROR_DEPOSIT_SOURCES,
  SET_DEPOSIT_SOURCES,
} from "../../../../utils/constants/storeType";
import { WYRE_SERVICE } from "../../../../utils/constants/intervalConstants";
import { updateLedgerValue } from "./UpdateLedgerValue";
import { getDepositSources } from "../../../../utils/api/routers/getDepositSources";

const channelMap = {
  [WYRE_SERVICE]: async (activeUser, coinObj) => {
    try {
      const sources = await getDepositSources(coinObj, WYRE_SERVICE);
      return {
        chainTicker: coinObj.id,
        channel: WYRE_SERVICE,
        header: {},
        body: sources,
      };
    } catch (e) {
      console.warn(e);
      throw e;
    }
  },
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
    channelMap
  );
