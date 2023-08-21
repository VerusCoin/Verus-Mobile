import {
  ERC20,
  ETH,
  VRPC,
  WYRE_SERVICE,
} from "../../constants/intervalConstants";
import * as wyre from "../channels/wyre/callCreators";
import * as vrpc from "../channels/vrpc/callCreators";
import { getWeb3ProviderForNetwork } from "../../web3/provider";
import { ETH_CONTRACT_ADDRESS } from "../../constants/web3Constants";

const CONVERSION_PATH_FUNCTION_MAP = {
  [WYRE_SERVICE]: wyre.getCurrencyConversionPaths,
  [VRPC]: (coinObj, channel, params) => {
    const [channelName, iAddress, systemId] = channel.split('.')

    return vrpc.getCurrencyConversionPaths(systemId, params.src)
  },
  [ERC20]: (coinObj, channel, params) => {
    return vrpc.getCurrencyConversionPaths(
      getWeb3ProviderForNetwork(coinObj.network).getVrscSystem(),
      params.src,
      coinObj.network,
    );
  },
  [ETH]: (coinObj, channel, params) => {
    return vrpc.getCurrencyConversionPaths(
      getWeb3ProviderForNetwork(coinObj.network).getVrscSystem(),
      ETH_CONTRACT_ADDRESS,
      coinObj.network,
    );
  }
};

/**
 * Returns the potential conversion paths 
 * @param {Object} coinObj The coin object
 * @param {String} channel The channel to search on
 * @param {Object} params Any other parameters specific to the send channel's search function
 */
export const getConversionPaths = async (coinObj, channel, params) => {
  const channelId = channel.split('.')[0]

  if (CONVERSION_PATH_FUNCTION_MAP[channelId] == null)
    throw new Error(`No conversion path function available for channel ${channelId}`);
  else return await CONVERSION_PATH_FUNCTION_MAP[channelId](coinObj, channel, params);
};