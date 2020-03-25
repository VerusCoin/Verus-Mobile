import { getCoinRates } from "../../../../utils/api/channels/general/callCreators";
import {
  ERROR_RATES,
  SET_RATES
} from "../../../../utils/constants/storeType";
import { GENERAL } from "../../../../utils/constants/intervalConstants";
import { getCoinObj } from "../../../../utils/CoinData/CoinData";

/**
 * Fetches the appropriate data from the store for the specified channel's fiat privces
 * update and dispatches a fiat price update or error action to the store.
 * @param {Object} state Reference to redux store state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request
 * @param {String} chainTicker Chain ticker id for chain to fetch balances for
 */
export const updateFiatPrices = async (
  state,
  dispatch,
  channels,
  chainTicker
) => {
  const coinObj = getCoinObj(state.coins.activeCoinsForUser, chainTicker);
  let channelsPassed = []

  await Promise.all(
    channels.map(async channel => {
      if (channel === GENERAL) {
        try {
          const coinRates = await getCoinRates(
            coinObj
          );

          const { result, ...header } = coinRates;

          dispatch({
            type: SET_RATES,
            payload: {
              chainTicker,
              channel,
              header,
              body: result
            }
          });
          channelsPassed.push(channel)
        } catch (error) {
          dispatch({ type: ERROR_RATES, payload: { error } });
        }
      }
    })
  );

  return channelsPassed.length === channels.length
};
