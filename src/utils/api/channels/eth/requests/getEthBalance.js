import Web3Provider from '../../../../web3/provider'
import ethers from 'ethers';
import BigNumber from "bignumber.js";

// Gets the Ethereum balance of an address or name as a big number
export const getEthBalance = async (address) => {
  return await Web3Provider.DefaultProvider.getBalance(address)
}

//TODO: Handle BigNumbers
export const getStandardEthBalance = async (address) => {
  return BigNumber(ethers.utils.formatUnits(await getEthBalance(address)))
}