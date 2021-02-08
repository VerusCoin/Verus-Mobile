import { DLIGHT_PRIVATE } from '../../../../utils/constants/intervalConstants'
import { getCoinObj } from '../../../../utils/CoinData/CoinData'
import { ENABLE_DLIGHT } from '../../../../../env/main.json'

/**
 * Fetches the appropriate data from the store for the specified channel's type
 * update and dispatches a balance update or error action to the store.
 * @param {Object} state Reference to redux store state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} chainTicker Chain ticker id for chain to fetch balances for
 * @param {String} successType Action type for success action
 * @param {String} errorType Action type for error action
 * @param {Object} channelMap Object that contains the functions to execute for each channel, functions must take in (activeUser, coinObj)
 */
export const updateLedgerValue = async (
  state,
  dispatch,
  channels,
  chainTicker,
  successType,
  errorType,
  channelMap
) => {
  const activeUser = state.authentication.activeAccount;
  const coinObj = getCoinObj(state.coins.activeCoinsForUser, chainTicker);
  let channelsPassed = [];

  await Promise.all(
    channels.map(async (channel) => {
      if (!channelMap[channel] || (channel === DLIGHT_PRIVATE && !ENABLE_DLIGHT))
        return;

      try {
        dispatch({
          type: successType,
          payload: await channelMap[channel](activeUser, coinObj),
        });
        channelsPassed.push(channel);
      } catch (error) {
        dispatch({ type: errorType, payload: { error, chainTicker, channel } });
      }
    })
  );

  return channelsPassed.length === channels.length;
};