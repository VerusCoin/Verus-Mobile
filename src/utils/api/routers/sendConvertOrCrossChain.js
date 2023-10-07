import {
  ETH,
  ERC20,
  VRPC,
} from "../../constants/intervalConstants";
import * as erc20 from "../channels/erc20/callCreator";
import * as vrpc from "../channels/vrpc/callCreators";

const SEND_FUNCTION_MAP = {
  [ETH]: (coinObj, channelId, activeUser, { approvalparams, transferparams, gasprice }) => {
    return erc20.sendBridgeTransfer(coinObj, transferparams, approvalparams, gasprice);
  },
  [ERC20]: (coinObj, channelId, activeUser, { approvalparams, transferparams, gasprice }) => {
    return erc20.sendBridgeTransfer(coinObj, transferparams, approvalparams, gasprice);
  },
  [VRPC]: (coinObj, channelId, activeUser, { hex, inputs }) => {
    return vrpc.sendCurrencyTransfer(coinObj, channelId, hex, inputs);
  }
};

export const sendConvertOrCrossChain = async (coinObj, activeUser, channelId, params) => {  
  const parentChannel = channelId.split('.')[0]

  if (SEND_FUNCTION_MAP[parentChannel] == null)
    throw new Error(`No send function available for channel ${channelId}`);
  else return await SEND_FUNCTION_MAP[parentChannel](coinObj, channelId, activeUser, params);
};
