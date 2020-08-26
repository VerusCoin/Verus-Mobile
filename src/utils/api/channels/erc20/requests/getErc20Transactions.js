import Web3Provider from '../../../../web3/provider'
import { ethTransactionsToBtc } from 'agama-wallet-lib/src/eth'
import { ETHERS } from '../../../../constants/web3Constants'

// Gets an ERC20 token transaction list for an address
export const getErc20Transactions = async (address, contractAddress) => {
  return await Web3Provider.EtherscanProvider.getHistory(address, contractAddress)
}

export const getStandardErc20Transactions = async(address, contractAddress, decimals = ETHERS) => {
  return ethTransactionsToBtc(
    await getErc20Transactions(address, contractAddress),
    address,
    true,
    decimals
  );
}