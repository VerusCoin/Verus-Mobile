import Web3Provider from '../../../../web3/provider'

// Gets the Ethereum balance of an address or name as a big number
export const getEthBalance = async (address) => {
  return await Web3Provider.DefaultProvider.getBalance(address)
}

export const getStandardErc20Balance = async (address) => {
  return ethers.utils.formatUnits(await getEthBalance(address))
}