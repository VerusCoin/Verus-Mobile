import { getWeb3ProviderForNetwork } from '../../../../web3/provider'
import { ethers } from 'ethers'
import { getTxReceipt } from './getTxReceipt'
import BigNumber from 'bignumber.js'
import { standardizeEthTxObj } from '../../../../standardization/standardizeTxObj'

// Gets the Ethereum transaction history of an address or name
export const getEthTransactions = async (address, network = 'homestead') => {
  return await getWeb3ProviderForNetwork(network).EtherscanProvider.getHistory(address)
}

export const getStandardEthTransactions = async (address, network) => {
  let processedTxs = standardizeEthTxObj(
    await getEthTransactions(address, network),
    address
  );

  for (let i = 0; i < processedTxs.length; i++) {
    let tx = processedTxs[i]

    if (tx.type === 'self') {
      const txReceipt = await getTxReceipt(tx.txid, network)
      const fee = ethers.utils.formatEther(txReceipt.gasUsed.mul(ethers.utils.parseEther(tx.gasPrice))).toString()

      processedTxs[i] = { ...tx, ...txReceipt, amount: fee, fee }
    }
  }

  return processedTxs
}