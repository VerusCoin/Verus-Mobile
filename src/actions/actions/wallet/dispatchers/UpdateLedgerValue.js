import { DLIGHT_PRIVATE } from '../../../../utils/constants/intervalConstants'
import { getCoinObj } from '../../../../utils/CoinData/CoinData'
import { dlightEnabled } from '../../../../utils/enabledChannels';

/**
 * Fetches the appropriate data from the store for the specified channel's type
 * update and dispatches a balance update or error action to the store.
 * @param {Object} state Reference to redux store state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} chainTicker Chain ticker id for chain to fetch balances for
 * @param {String} successType Action type for success action
 * @param {String} errorType Action type for error action
 * @param {Function} fetchChannels Function that takes activeUser object and returns 
 * an object that contains the functions to execute for each channel, functions must take in (activeUser, coinObj)
 */
export const updateLedgerValue = async (
  state,
  dispatch,
  channels,
  chainTicker,
  successType,
  errorType,
  fetchChannels
) => {
  const activeUser = state.authentication.activeAccount;
  const coinObj = getCoinObj(state.coins.activeCoinsForUser, chainTicker);
  let channelsPassed = [];
  const channelMap = fetchChannels(activeUser)

  await Promise.all(
    channels.map(async (channel) => {
      if (!channelMap[channel] || (channel === DLIGHT_PRIVATE && !dlightEnabled()))
        return;

      try {
        dispatch({
          type: successType,
          payload: await channelMap[channel](coinObj),
        });
        channelsPassed.push(channel);
      } catch (error) {
        dispatch({ type: errorType, payload: { error, chainTicker, channel } });
      }
    })
  );

  return channelsPassed.length === channels.length;
};