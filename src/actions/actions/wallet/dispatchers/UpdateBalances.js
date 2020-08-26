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
import { satsToCoins } from "../../../../utils/math";
import { updateLedgerValue } from "./UpdateLedgerValue";

const channelMap = {
  [DLIGHT]: async (activeUser, coinObj) => {
    const zBalances = await getPrivateBalance(
      coinObj.id,
      activeUser.accountHash,
      coinObj.proto
    );

    const { result, ...header } = zBalances;
    const { confirmed, total } = result;

    return {
      chainTicker: coinObj.id,
      channel: DLIGHT,
      header,
      body: {
        confirmed: confirmed,
        pending: total - confirmed,
        total: total,
      },
    };
  },
  [ELECTRUM]: async (activeUser, coinObj) => {
    const balances = await getOneBalance(coinObj, activeUser);

    const { result, ...header } = balances;
    const { confirmed, unconfirmed } = result;

    return {
      chainTicker: coinObj.id,
      channel: ELECTRUM,
      header,
      body: {
        confirmed: satsToCoins(confirmed),
        pending: satsToCoins(unconfirmed),
        total: satsToCoins(unconfirmed + confirmed),
      },
    };
  }
};

/**
 * Fetches the appropriate data from the store for the specified channel's balance
 * update and dispatches a balance update or error action to the store.
 * @param {Object} state Reference to redux store state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} chainTicker Chain ticker id for chain to fetch balances for
 */
export const updateBalances = (state, dispatch, channels, chainTicker) =>
  updateLedgerValue(
    state,
    dispatch,
    channels,
    chainTicker,
    SET_BALANCES,
    ERROR_BALANCES,
    channelMap
  );
