import {
  ERC20,
  ETH,
  VRPC
} from "../../constants/intervalConstants";
import * as vrpc from "../channels/vrpc/callCreators";
import * as eth from "../channels/eth/callCreator";
import * as erc20 from "../channels/erc20/callCreator";

const ADDRESS_BALANCE_FUNCTION_MAP = {
  [VRPC]: async (coinObj, channel, params) => {
    const [channelName, iAddress, systemId] = channel.split('.');

    const balanceRes = await vrpc.getAddressBalances(systemId, [params.address]);

    if (balanceRes.error) throw new Error(balanceRes.error.message);
    else {
      return balanceRes.result.currencybalance ? balanceRes.result.currencybalance : {};
    }
  },
  [ETH]: async (coinObj, channel, params) => {
    const balanceRes = await eth.getStandardEthBalance(params.address, coinObj.network);

    return {
      [coinObj.currency_id]: balanceRes
    }
  },
  [ERC20]: async (coinObj, channel, params) => {
    const balanceRes = await erc20.getStandardErc20Balance(
      params.address,
      coinObj.currency_id,
      coinObj.decimals,
      coinObj.network,
    );

    return {
      [coinObj.currency_id]: balanceRes
    }
  }
};

/**
 * Returns the address balance
 * @param {Object} coinObj The coin object
 * @param {String} channel The channel to search on
 * @param {Object} params Any other parameters specific to the send channel's search function
 */
export const getAddressBalances = async (coinObj, channel, params) => {
  const channelId = channel.split('.')[0]

  if (ADDRESS_BALANCE_FUNCTION_MAP[channelId] == null)
    throw new Error(`No address balance function available for channel ${channelId}`);
  else return await ADDRESS_BALANCE_FUNCTION_MAP[channelId](coinObj, channel, params);
};