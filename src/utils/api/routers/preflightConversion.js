import { WYRE_SERVICE } from "../../constants/intervalConstants";
import * as wyre from "../channels/wyre/callCreators";

const PREFLIGHT_FUNCTION_MAP = {
  [WYRE_SERVICE]: wyre.preflightConversion,
};

/**
 * Creates and returns an object describing a potential conversion without sending the conversion tx.
 * Returns an error object if the conversion were to fail.
 */
export const preflightConversion = async (
  coinObj,
  activeUser,
  from,
  to,
  address,
  amount,
  channel,
  params
) => {
  if (PREFLIGHT_FUNCTION_MAP[channel] == null)
    throw new Error(`No conversion preflight function available for channel ${channel}`);
  else
    return await PREFLIGHT_FUNCTION_MAP[channel](
      coinObj,
      activeUser,
      from,
      to,
      address,
      amount,
      params
    );
};
