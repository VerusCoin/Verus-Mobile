import Web3Provider from '../../../../web3/provider'
import { ethers } from 'ethers'
import { getTxReceipt } from './getTxReceipt'
import BigNumber from 'bignumber.js'
import { standardizeEthTxObj } from '../../../../standardization/standardizeTxObj'

// Gets the Ethereum transaction history of an address or name
export const getEthTransactions = async (address) => {
  return await Web3Provider.EtherscanProvider.getHistory(address)
}

export const getStandardEthTransactions = async (address) => {
  let processedTxs = standardizeEthTxObj(
    await getEthTransactions(address),
    address);

  for (let i = 0; i < processedTxs.length; i++) {
    let tx = processedTxs[i]

    if (tx.type === 'self') {
      const txReceipt = await getTxReceipt(tx.txid)
      const fee = ethers.utils.formatEther(txReceipt.gasUsed.mul(ethers.utils.parseEther(tx.gasPrice))).toString()

      processedTxs[i] = { ...tx, ...txReceipt, amount: fee, fee }
    }
  }

  return processedTxs
}