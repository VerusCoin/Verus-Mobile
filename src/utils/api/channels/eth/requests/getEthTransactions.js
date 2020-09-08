import Web3Provider from '../../../../web3/provider'
import { ethTransactionsToBtc } from 'agama-wallet-lib/src/eth'
import { ETHERS } from '../../../../constants/web3Constants'
import { ethers } from 'ethers'
import { getTxReceipt } from './getTxReceipt'

// Gets the Ethereum transaction history of an address or name
export const getEthTransactions = async (address) => {
  return await Web3Provider.EtherscanProvider.getHistory(address)
}

export const getStandardEthTransactions = async(address) => {
  let processedTxs = ethTransactionsToBtc(
    await getEthTransactions(address),
    address,
    false,
    ETHERS
  );

  for (let i = 0; i < processedTxs.length; i++) {
    let tx = processedTxs[i]

    if (tx.type === 'self') {
      const txReceipt = await getTxReceipt(tx.txid)
      const fee = Number(ethers.utils.formatEther(txReceipt.gasUsed.mul(ethers.utils.parseEther(tx.gasPrice))))

      processedTxs[i] = { ...tx, ...txReceipt, amount: fee, fee }
    }
  }

  return processedTxs
}