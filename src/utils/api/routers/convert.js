import { WYRE_SERVICE } from "../../constants/intervalConstants";
import * as wyre from "../channels/wyre/callCreators";

const CONVERT_FUNCTION_MAP = {
  [WYRE_SERVICE]: wyre.convert,
};

export const convert = async (
  coinObj,
  activeUser,
  from,
  to,
  address,
  amount,
  channel,
  params
) => {
  if (CONVERT_FUNCTION_MAP[channel] == null)
    throw new Error(`No conversion function available for channel ${channel}`);
  else
    return await CONVERT_FUNCTION_MAP[channel](
      coinObj,
      activeUser,
      from,
      to,
      address,
      amount,
      params
    );
};
