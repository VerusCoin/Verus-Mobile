import { getWeb3ProviderForNetwork } from '../../../../web3/provider'
import { ethers } from 'ethers';
import BigNumber from "bignumber.js";

// Gets the Ethereum balance of an address or name as a big number
export const getEthBalance = async (address, network = 'homestead') => {
  return await getWeb3ProviderForNetwork(network).DefaultProvider.getBalance(address)
}

//TODO: Handle BigNumbers
export const getStandardEthBalance = async (address, network) => {
  return BigNumber(ethers.formatUnits(await getEthBalance(address, network)))
}