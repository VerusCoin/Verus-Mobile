import { unstable_batchedUpdates } from 'react-native'
import { DLIGHT_PRIVATE } from '../../../../utils/constants/intervalConstants'
import { getCoinObj } from '../../../../utils/CoinData/CoinData'
import { dlightEnabled } from '../../../../utils/enabledChannels';
import { CoinDirectory } from '../../../../utils/CoinData/CoinDirectory';
import { beginSessionRequest } from '../../updates/sessionRequests';

// One network answer can hold the results for many cards. Each result that
// reaches the store alone draws every asset row again. Results that arrive
// together go to the store together, so the screens draw once.
const waitingResults = [];

const dispatchWithNextResults = (dispatch, action) =>
  new Promise((resolve, reject) => {
    waitingResults.push({dispatch, action, resolve, reject});
    if (waitingResults.length > 1) return;

    setTimeout(() => {
      const results = waitingResults.splice(0);

      unstable_batchedUpdates(() => {
        for (const result of results) {
          try {
            result.dispatch(result.action);
            result.resolve();
          } catch (error) {
            result.reject(error);
          }
        }
      });
    }, 0);
  });

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
  fetchChannels,
  requestContext,
) => {
  const activeUser = state.authentication.activeAccount;
  const coinObj = CoinDirectory.findCoinObj(chainTicker, activeUser.id);
  let channelsPassed = [];
  const channelMap = fetchChannels(activeUser)

  await Promise.all(
    channels.map(async (channelId) => {
      const parentChannel = channelId.split('.')[0]

      if (!channelMap[parentChannel] || (parentChannel === DLIGHT_PRIVATE && !dlightEnabled()))
        return;

      const request = beginSessionRequest(
        state,
        dispatch,
        `ledger:${successType}:${chainTicker}:${channelId}`,
      );

      try {
        const payload = await channelMap[parentChannel](coinObj, channelId, {
          ...requestContext,
          signal: request.signal,
          requestId: request.meta.requestId,
          accountHash: request.meta.accountHash,
          sessionEpoch: request.meta.sessionEpoch,
        });
        await dispatchWithNextResults(dispatch, {
          type: successType,
          payload,
          meta: request.meta,
        });
        channelsPassed.push(channelId);
      } catch (error) {
        dispatch({
          type: errorType,
          payload: { error: error.message, chainTicker, channel: channelId },
          meta: request.meta,
        });
      } finally {
        request.complete();
      }
    })
  );

  return channelsPassed.length === channels.length;
};
