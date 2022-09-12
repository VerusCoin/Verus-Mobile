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

const SEND_FUNCTION_MAP = {
  [ELECTRUM]: electrum.sendRawTx,
  [ETH]: eth.send,
  [ERC20]: erc20.send,
  [DLIGHT_PRIVATE]: dlight.sendPrivateTransaction,
  [WYRE_SERVICE]: wyre.send,
  [VRPC]: vrpc.send
};

/**
 * Sends a transaction and returns an object describing the sent transaction
 * @param {Object} coinObj The coin object describing the chain to send on
 * @param {Object} activeUser The user object of the user performing the send
 * @param {String} address The destination address
 * @param {Number} amount The amount to send
 * @param {String} channelId The channel id to send on (e.g. ETH/ELECTRUM/ERC20)
 * @param {Object} params Any other parameters specific to the send channel's preflight function
 */
export const send = async (coinObj, activeUser, address, amount, channelId, params) => {
  const parentChannel = channelId.split('.')[0]

  if (SEND_FUNCTION_MAP[parentChannel] == null)
    throw new Error(`No send function available for channel ${channelId}`);
  else return await SEND_FUNCTION_MAP[parentChannel](coinObj, activeUser, address, amount, params, channelId);
};
