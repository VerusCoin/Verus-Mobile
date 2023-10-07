// systemId, iAddressOrName, height, txproof, txproofheight
import {
  ETH,
  ERC20,
  VRPC,
} from "../../constants/intervalConstants";
import { getWeb3ProviderForNetwork } from "../../web3/provider";
import { getIdentity as vrpcGetIdentity } from "../channels/verusid/callCreators";

const IDENTITY_FUNCTION_MAP = {
  [ETH]: (coinObj, activeUser, channelId, iAddressOrName, height, txproof, txproofheight) => {
    const Web3Provider = getWeb3ProviderForNetwork(coinObj.network);
    return vrpcGetIdentity(Web3Provider.getVrscSystem(), iAddressOrName, height, txproof, txproofheight);
  },
  [ERC20]: (coinObj, activeUser, channelId, iAddressOrName, height, txproof, txproofheight) => {
    const Web3Provider = getWeb3ProviderForNetwork(coinObj.network);
    return vrpcGetIdentity(Web3Provider.getVrscSystem(), iAddressOrName, height, txproof, txproofheight);
  },
  [VRPC]: (coinObj, activeUser, channelId, iAddressOrName, height, txproof, txproofheight) => {
    const [channelName, iAddress, systemId] = channelId.split('.');

    return vrpcGetIdentity(systemId, iAddressOrName, height, txproof, txproofheight);
  }
};

export const getIdentity = async (coinObj, activeUser, channelId, iAddressOrName, height, txproof, txproofheight) => {  
  const parentChannel = channelId.split('.')[0]

  if (IDENTITY_FUNCTION_MAP[parentChannel] == null)
    throw new Error(`No get identity function available for channel ${channelId}`);
  else return await IDENTITY_FUNCTION_MAP[parentChannel](coinObj, activeUser, channelId, iAddressOrName, height, txproof, txproofheight);
};
