import { ethers } from "ethers"
import { ETHERS } from "../../../../constants/web3Constants"
import { getWeb3ProviderForNetwork } from "../../../../web3/provider"
import BigNumber from "bignumber.js";

/**
 * Gets the balance of an address in an ERC20 token as a big number
 * @param {string} address The ethereum address to get the balance of
 * @param {Object} contract The contract object of the ERC20 token created in the Web3Interface
 */
export const getErc20Balance = async (address, contract) => {  
  if (contract == null) throw new Error("No contract provided to fetch balances")

  if (contract.balanceOf) {
    return await contract.balanceOf(address)
  } else {
    throw new Error(`ERC20 contract ${await contract.getAddress()} does not support a known balance function.`)
  }
}

export const getStandardErc20Balance = async (address, contractAddress, decimals = ETHERS, network = 'homestead') => {
  const web3 = getWeb3ProviderForNetwork(network)
  let balance

  try {
    balance = await getErc20Balance(
      address,
      web3.getContract(contractAddress, [
          {
            "constant":true,
            "inputs":[{"name":"_owner","type":"address"}],
            "name":"balanceOf",
            "outputs":[{"name":"balance","type":"uint256"}],
            "type":"function"
          }
        ])
    )
  } catch (error) {
    // See Web3Interface.renewDefaultProvider.
    web3.renewDefaultProvider()
    throw error
  }

  return BigNumber(ethers.formatUnits(balance, decimals));
};