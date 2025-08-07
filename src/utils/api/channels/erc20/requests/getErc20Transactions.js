import { getWeb3ProviderForNetwork } from '../../../../web3/provider'
import { ETHERS } from '../../../../constants/web3Constants'
import { ethers } from 'ethers'
import { ETH } from '../../../../constants/intervalConstants'
import { getTxReceipt } from '../../eth/requests/getTxReceipt'
import { standardizeEthTxObj } from '../../../../standardization/standardizeTxObj'

// Gets an ERC20 token transaction list for an address
export const getErc20Transactions = async (address, contractAddress, network = 'homestead') => {
  return await getWeb3ProviderForNetwork(network).EtherscanProvider.getHistory(address, null, null, contractAddress)
}

export const getStandardErc20Transactions = async(address, contractAddress, decimals = ETHERS, network) => {
  try {
    const erc20txs = await getErc20Transactions(address, contractAddress, network);

    let processedTxs = standardizeEthTxObj(
      erc20txs,
      address,
      decimals,
      true
    );
  
    for (let i = 0; i < processedTxs.length; i++) {
      let tx = processedTxs[i]
  
      if (tx.type === 'self') {
        const txReceipt = await getTxReceipt(tx.txid, network)
        const fee = ethers.formatEther(txReceipt.gasUsed * ethers.parseEther(tx.gasPrice)).toString();
  
        processedTxs[i] = { ...txReceipt, ...tx, amount: "0", fee, feeCurr: ETH.toUpperCase() }
      }
    }
  
    return processedTxs
  } catch(e) {
    console.log(e)
    throw e
  }
}