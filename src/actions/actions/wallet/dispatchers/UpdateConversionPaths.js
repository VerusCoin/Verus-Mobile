import {
  ERROR_CONVERSION_PATHS,
  SET_CONVERSION_PATHS,
} from "../../../../utils/constants/storeType";
import { WYRE_SERVICE } from "../../../../utils/constants/intervalConstants";
import { updateLedgerValue } from "./UpdateLedgerValue";
import { getConversionPaths } from "../../../../utils/api/routers/getConversionPaths";

const channelMap = {
  [WYRE_SERVICE]: async (activeUser, coinObj) => {
    const paths = await getConversionPaths(coinObj, WYRE_SERVICE);

    return {
      chainTicker: coinObj.id,
      channel: WYRE_SERVICE,
      header: {},
      body: paths,
    };
  },
};

/**
 * Fetches the appropriate data from the store for the specified channel's conversion path info
 * update and dispatches a conversion path update or error action to the store.
 * @param {Object} state Reference to redux store state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} chainTicker Chain ticker id for chain to fetch balances for
 */
export const updateConversionPaths = (state, dispatch, channels, chainTicker) =>
  updateLedgerValue(
    state,
    dispatch,
    channels,
    chainTicker,
    SET_CONVERSION_PATHS,
    ERROR_CONVERSION_PATHS,
    channelMap
  );
