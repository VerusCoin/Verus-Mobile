import {
  ERROR_BALANCES,
  SET_BALANCES
} from "../../../../utils/constants/storeType";
import {
  DLIGHT_PRIVATE,
  ELECTRUM,
  ETH,
  ERC20,
  WYRE_SERVICE,
  VRPC
} from "../../../../utils/constants/intervalConstants";
import { updateLedgerValue } from "./UpdateLedgerValue";
import { updateDlightBalances } from "./dlight/updates";
import { updateElectrumBalances } from "./electrum/updates";
import { updateErc20Balances } from "./erc20/updates";
import { updateEthBalances } from "./eth/updates";
import { updateWyreBalances } from "./wyre/updates";
import { updateVrpcBalances } from "./vrpc/updates";

const fetchChannels = (activeUser) => {
  return {
    [DLIGHT_PRIVATE]: (coinObj) => updateDlightBalances(activeUser, coinObj),
    [ELECTRUM]: (coinObj) => updateElectrumBalances(activeUser, coinObj),
    [ETH]: (coinObj) => updateEthBalances(activeUser, coinObj),
    [ERC20]: (coinObj) => updateErc20Balances(activeUser, coinObj),
    [WYRE_SERVICE]: (coinObj) => updateWyreBalances(coinObj),
    [VRPC]: (coinObj, channelId) => updateVrpcBalances(coinObj, channelId)
  };
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
    fetchChannels
  );
