import {
  WYRE_SERVICE,
} from "../../constants/intervalConstants";
import * as wyre from "../channels/wyre/callCreators";

const CONVERSION_PATH_FUNCTION_MAP = {
  [WYRE_SERVICE]: wyre.getCurrencyConversionPaths,
};

/**
 * Returns the potential conversion paths 
 * @param {Object} coinObj The coin object
 * @param {String} channel The channel to search on
 * @param {Object} params Any other parameters specific to the send channel's search function
 */
export const getConversionPaths = async (coinObj, channel, params) => {
  if (CONVERSION_PATH_FUNCTION_MAP[channel] == null)
    throw new Error(`No conversion path function available for channel ${channel}`);
  else return await CONVERSION_PATH_FUNCTION_MAP[channel](coinObj, channel, params);
};