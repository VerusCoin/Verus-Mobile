import Web3Provider from '../../../../web3/provider'
import { ethTransactionsToBtc } from 'agama-wallet-lib/src/eth'
import { ETHERS } from '../../../../constants/web3Constants'

// Gets the Ethereum transaction history of an address or name
export const getEthTransactions = async (address) => {
  return await Web3Provider.EtherscanProvider.getHistory(address)
}

export const getStandardEthTransactions = async(address) => {
  return ethTransactionsToBtc(
    await getEthTransactions(address),
    address,
    false,
    ETHERS
  );
}