import {
  ETH,
  ERC20,
  VRPC,
} from "../../constants/intervalConstants";
import * as erc20 from "../channels/erc20/callCreator";
import * as vrpc from "../channels/vrpc/callCreators";

const PREFLIGHT_FUNCTION_MAP = {
  [ETH]: erc20.preflightBridgeTransfer,
  [ERC20]: erc20.preflightBridgeTransfer,
  [VRPC]: vrpc.preflightCurrencyTransfer
};

export const preflightConvertOrCrossChain = async (coinObj, activeUser, channelId, output) => {  
  const parentChannel = channelId.split('.')[0]

  if (PREFLIGHT_FUNCTION_MAP[parentChannel] == null)
    throw new Error(`No preflight function available for channel ${channelId}`);
  else return await PREFLIGHT_FUNCTION_MAP[parentChannel](coinObj, channelId, activeUser, output);
};
