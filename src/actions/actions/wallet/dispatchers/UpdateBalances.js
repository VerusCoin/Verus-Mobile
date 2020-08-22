import { getPrivateBalance } from "../../../../utils/api/channels/dlight/callCreators";
import { getOneBalance } from "../../../../utils/api/channels/electrum/callCreators";
import {
  ERROR_BALANCES,
  SET_BALANCES
} from "../../../../utils/constants/storeType";
import {
  DLIGHT,
  ELECTRUM
} from "../../../../utils/constants/intervalConstants";
import { getCoinObj } from "../../../../utils/CoinData/CoinData";
import { satsToCoins } from "../../../../utils/math";

/**
 * Fetches the appropriate data from the store for the specified channel's balance
 * update and dispatches a balance update or error action to the store.
 * @param {Object} state Reference to redux store state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} chainTicker Chain ticker id for chain to fetch balances for
 */
export const updateBalances = async (
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
          const zBalances = await getPrivateBalance(
            chainTicker,
            accountHash,
            coinObj.proto
          );

          const { result, ...header } = zBalances;
          const { confirmed, total } = result;

          dispatch({
            type: SET_BALANCES,
            payload: {
              chainTicker,
              channel,
              header,
              body: {
                confirmed: confirmed,
                pending: total - confirmed,
                total: total
              }
            }
          });
          channelsPassed.push(channel)
        } catch (error) {
          dispatch({ type: ERROR_BALANCES, payload: { error } });
        }
      } else if (channel === ELECTRUM) {
        try {
          const balances = await getOneBalance(coinObj, activeUser);

          const { result, ...header } = balances;
          const { confirmed, unconfirmed } = result;

          dispatch({
            type: SET_BALANCES,
            payload: {
              chainTicker,
              channel,
              header,
              body: {
                confirmed: satsToCoins(confirmed),
                pending: satsToCoins(unconfirmed),
                total: satsToCoins(unconfirmed + confirmed)
              }
            }
          });
          channelsPassed.push(channel)
        } catch (error) {
          dispatch({ type: ERROR_BALANCES, payload: { error } });
        }
      }
    })
  );

  return channelsPassed.length === channels.length
};
