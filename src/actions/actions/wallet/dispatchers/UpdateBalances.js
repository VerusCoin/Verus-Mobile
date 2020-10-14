import { getPrivateBalance } from "../../../../utils/api/channels/dlight/callCreators";
import { getOneBalance } from "../../../../utils/api/channels/electrum/callCreators";
import {
  ERROR_BALANCES,
  SET_BALANCES
} from "../../../../utils/constants/storeType";
import {
  DLIGHT,
  ELECTRUM,
  ETH,
  ERC20
} from "../../../../utils/constants/intervalConstants";
import { satsToCoins } from "../../../../utils/math";
import { updateLedgerValue } from "./UpdateLedgerValue";
import { getStandardEthBalance } from "../../../../utils/api/channels/eth/callCreator";
import { getStandardErc20Balance } from "../../../../utils/api/channels/erc20/callCreator";

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
        pending: total.minus(confirmed).toString(),
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
        confirmed: satsToCoins(confirmed).toString(),
        pending: satsToCoins(unconfirmed).toString(),
        total: satsToCoins(unconfirmed.plus(confirmed)).toString(),
      },
    };
  },
  [ETH]: async (activeUser, coinObj) => {
    if (
      activeUser.keys[coinObj.id] != null &&
      activeUser.keys[coinObj.id][ETH] != null &&
      activeUser.keys[coinObj.id][ETH].addresses.length > 0
    ) {
      const balance = (await getStandardEthBalance(activeUser.keys[coinObj.id][ETH].addresses[0])).toString();

      return {
        chainTicker: coinObj.id,
        channel: ETH,
        header: {},
        body: {
          confirmed: balance,
          pending: "0",
          total: balance
        },
      };
    } else {
      throw new Error(
        "updateBalances.js: Fatal mismatch error, " +
          activeUser.id +
          " user keys for active coin " +
          coinObj.id +
          " not found!"
      );
    }
  },
  [ERC20]: async (activeUser, coinObj) => {
    if (
      activeUser.keys[coinObj.id] != null &&
      activeUser.keys[coinObj.id][ERC20] != null &&
      activeUser.keys[coinObj.id][ERC20].addresses.length > 0
    ) {
      const balance = (await getStandardErc20Balance(
        activeUser.keys[coinObj.id][ERC20].addresses[0],
        coinObj.currency_id,
        coinObj.decimals
      )).toString();

      return {
        chainTicker: coinObj.id,
        channel: ERC20,
        header: {},
        body: {
          confirmed: balance,
          pending: "0",
          total: balance
        },
      };
    } else {
      throw new Error(
        "updateBalances.js: Fatal mismatch error, " +
          activeUser.id +
          " user keys for active coin " +
          coinObj.id +
          " not found!"
      );
    }
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
