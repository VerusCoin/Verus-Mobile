import {
  ELECTRUM,
  ETH,
  ERC20,
  DLIGHT_PRIVATE,
  WYRE_SERVICE,
  VRPC,
} from "../../constants/intervalConstants";
import * as electrum from "../channels/electrum/callCreators";
import * as eth from "../channels/eth/callCreator";
import * as erc20 from "../channels/erc20/callCreator";
import * as dlight from "../channels/dlight/callCreators";
import * as wyre from "../channels/wyre/callCreators";
import * as vrpc from "../channels/vrpc/callCreators";

const PREFLIGHT_FUNCTION_MAP = {
  [ELECTRUM]: electrum.txPreflight,
  [ETH]: eth.txPreflight,
  [ERC20]: erc20.txPreflight,
  [DLIGHT_PRIVATE]: dlight.preflightPrivateTransaction,
  [WYRE_SERVICE]: wyre.txPreflight,
  [VRPC]: vrpc.preflight
};

/**
 * Creates and returns an object describing a potential transaction without sending the transaction.
 * Returns an error object if the transaction were to fail.
 * @param {Object} coinObj The coin object describing the chain to send on
 * @param {Object} activeUser The user object of the user performing the send
 * @param {String} address The destination address
 * @param {BigNumber} amount The amount to send (in BigNumber form from bignumber.js)
 * @param {String} channelId The channel id to send on (e.g. ETH/ELECTRUM/ERC20)
 * @param {Object} params Any other parameters specific to the send channel's preflight function
 */
export const preflightSend = async (coinObj, activeUser, address, amount, channelId, params) => {  
  const parentChannel = channelId.split('.')[0]

  if (PREFLIGHT_FUNCTION_MAP[parentChannel] == null)
    throw new Error(`No preflight function available for channel ${channelId}`);
  else return await PREFLIGHT_FUNCTION_MAP[parentChannel](coinObj, activeUser, address, amount, params, channelId);
};
