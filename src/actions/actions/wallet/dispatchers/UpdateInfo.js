import { getInfo } from "../../../../utils/api/channels/dlight/callCreators";
import {
  ERROR_INFO,
  SET_INFO
} from "../../../../utils/constants/storeType";
import { DLIGHT_PRIVATE } from "../../../../utils/constants/intervalConstants";
import { updateLedgerValue } from "./UpdateLedgerValue";

const channelMap = {
  [DLIGHT_PRIVATE]: async (activeUser, coinObj) => {
    const syncInfo = await getInfo(coinObj.id, activeUser.accountHash, coinObj.proto);

    const { result, ...header } = syncInfo;

    return {
      chainTicker: coinObj.id,
      channel: DLIGHT_PRIVATE,
      header,
      body: result,
    };
  },
};

/**
 * Fetches the appropriate data from the store for the specified channel's syncing info
 * update and dispatches a balance update or error action to the store. (dlight only)
 * @param {Object} state Reference to redux store state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} chainTicker Chain ticker id for chain to fetch balances for
 */
export const updateInfo = (state, dispatch, channels, chainTicker) =>
  updateLedgerValue(
    state,
    dispatch,
    channels,
    chainTicker,
    SET_INFO,
    ERROR_INFO,
    channelMap
  );
