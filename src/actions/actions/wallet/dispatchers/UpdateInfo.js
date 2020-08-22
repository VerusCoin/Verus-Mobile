import { getInfo } from "../../../../utils/api/channels/dlight/callCreators";
import {
  ERROR_INFO,
  SET_INFO
} from "../../../../utils/constants/storeType";
import { DLIGHT } from "../../../../utils/constants/intervalConstants";
import { getCoinObj } from "../../../../utils/CoinData/CoinData";

/**
 * Fetches the appropriate data from the store for the specified channel's syncing info
 * update and dispatches a balance update or error action to the store. (dlight only)
 * @param {Object} state Reference to redux store state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} chainTicker Chain ticker id for chain to fetch balances for
 */
export const updateInfo = async (
  state,
  dispatch,
  channels,
  chainTicker
) => {
  const activeUser = state.authentication.activeAccount;
  const { accountHash } = activeUser;
  const coinObj = getCoinObj(state.coins.activeCoinsForUser, chainTicker);
  let channelsPassed = []

  await Promise.all(
    channels.map(async channel => {
      if (channel === DLIGHT && global.ENABLE_DLIGHT) {
        try {
          const syncInfo = await getInfo(
            chainTicker,
            accountHash,
            coinObj.proto
          );

          const { result, ...header } = syncInfo;

          dispatch({
            type: SET_INFO,
            payload: {
              chainTicker,
              channel,
              header,
              body: result
            }
          });
          channelsPassed.push(channel)
        } catch (error) {
          dispatch({ type: ERROR_INFO, payload: { error } });
        }
      }
    })
  );

  return channelsPassed.length === channels.length
};
