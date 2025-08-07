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
  const ethTxs = await getEthTransactions(address, network);

  let processedTxs = standardizeEthTxObj(
    ethTxs,
    address
  );

  for (let i = 0; i < processedTxs.length; i++) {
    let tx = processedTxs[i]

    if (tx.type === 'self') {
      const txReceipt = await getTxReceipt(tx.txid, network)
      const fee = ethers.formatEther(txReceipt.gasUsed * ethers.parseEther(tx.gasPrice)).toString()

      processedTxs[i] = { ...txReceipt, ...tx, amount: fee, fee }
    }
  }

  return processedTxs
}