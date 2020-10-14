import Web3Provider from '../../../../web3/provider'
import { ETHERS } from '../../../../constants/web3Constants'
import { ethers } from 'ethers'
import { ETH } from '../../../../constants/intervalConstants'
import { getTxReceipt } from '../../eth/requests/getTxReceipt'
import BigNumber from 'bignumber.js'
import { standardizeEthTxObj } from '../../../../standardization/standardizeTxObj'

// Gets an ERC20 token transaction list for an address
export const getErc20Transactions = async (address, contractAddress) => {
  return await Web3Provider.EtherscanProvider.getHistory(address, null, null, contractAddress)
}

export const getStandardErc20Transactions = async(address, contractAddress, decimals = ETHERS) => {
  let processedTxs = standardizeEthTxObj(
    await getErc20Transactions(address, contractAddress),
    address,
    decimals
  );

  for (let i = 0; i < processedTxs.length; i++) {
    let tx = processedTxs[i]

    if (tx.type === 'self') {
      const txReceipt = await getTxReceipt(tx.txid)
      const fee = ethers.utils.formatEther(txReceipt.gasUsed.mul(ethers.utils.parseEther(tx.gasPrice))).toString();

      processedTxs[i] = { ...tx, ...txReceipt, amount: "0", fee, feeCurr: ETH.toUpperCase() }
    }
  }

  return processedTxs
}