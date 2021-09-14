import {
  WYRE_SERVICE,
} from "../../constants/intervalConstants";
import * as wyre from "../channels/wyre/callCreators";

const CONVERSION_PATH_FUNCTION_MAP = {
  [WYRE_SERVICE]: wyre.getPendingDeposits,
};

export const getPendingDeposits = async (coinObj, channel) => {
  if (CONVERSION_PATH_FUNCTION_MAP[channel] == null)
    throw new Error(`No pending deposit function available for channel ${channel}`);
  else return await CONVERSION_PATH_FUNCTION_MAP[channel](coinObj, channel);
};