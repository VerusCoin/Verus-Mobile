import { getCoinRates } from "../../../../utils/api/channels/general/callCreators";
import {
  ERROR_RATES,
  SET_RATES
} from "../../../../utils/constants/storeType";
import { GENERAL } from "../../../../utils/constants/intervalConstants";
import { updateLedgerValue } from "./UpdateLedgerValue";

const channelMap = {
  [GENERAL]: async (activeUser, coinObj) => {
    const coinRates = await getCoinRates(coinObj);

    const { result, ...header } = coinRates;

    return {
      chainTicker: coinObj.id,
      channel: GENERAL,
      header,
      body: result,
    };
  },
};

/**
 * Fetches the appropriate data from the store for the specified channel's fiat privces
 * update and dispatches a fiat price update or error action to the store.
 * @param {Object} state Reference to redux store state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request
 * @param {String} chainTicker Chain ticker id for chain to fetch balances for
 */
export const updateFiatPrices = (state, dispatch, channels, chainTicker) =>
  updateLedgerValue(
    state,
    dispatch,
    channels,
    chainTicker,
    SET_RATES,
    ERROR_RATES,
    channelMap
  );
