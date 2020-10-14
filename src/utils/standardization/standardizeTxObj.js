import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { ETHERS } from "../constants/web3Constants";
const { formatEther, formatUnits } = ethers.utils

// Makes transaction objects from lightwalletd client resemble those from electrum,
// for predictable, standard behaviour
export const standardizeDlightTxObj = (txObj) => {
  const { address, amount, category, height, status, time, txid, memo } = txObj
  return {
    address,
    amount: typeof amount !== 'string' ? amount.toString() : amount,
    type: category,
    height,
    status,
    timestamp: time,
    txid,
    memo
  }
}

export const standardizeEthTxObj = (transactions, address, decimals = ETHERS) => {
  let _txs = [];

  if (transactions.length) {
    for (let i = 0; i < transactions.length; i++) {
      let type;

      if (transactions[i].from === transactions[i].to) {
        type = 'self';
      } else if (transactions[i].from && transactions[i].from.toLowerCase() === address.toLowerCase()) {
        type = 'sent';                    
      } else if (transactions[i].to && transactions[i].to.toLowerCase() === address.toLowerCase()) {
        type = 'received';                    
      }

      let _txObj = {
        type,
        height: transactions[i].blockNumber,
        timestamp: transactions[i].timestamp,
        txid: transactions[i].hash,
        nonce: transactions[i].nonce,
        blockhash: transactions[i].blockHash,
        txindex: transactions[i].transactionIndex,
        src: transactions[i].from,
        address: transactions[i].to,
        amount:
          transactions[i].value != null
            ? formatUnits(transactions[i].value, decimals)
            : null,
        gas:
          transactions[i].gas != null
            ? formatEther(transactions[i].gas)
            : null,
        gasPrice:
          transactions[i].gasPrice != null
            ? formatEther(transactions[i].gasPrice)
            : null,
        cumulativeGasUsed:
          transactions[i].cumulativeGasUsed != null
            ? formatEther(transactions[i].cumulativeGasUsed)
            : null,
        gasUsed:
          transactions[i].gasUsed != null
            ? formatEther(transactions[i].gasUsed)
            : null,
        fee:
          transactions[i].gasPrice != null &&
          transactions[i].gasUsed != null
            ? formatEther(
                BigNumber(transactions[i].gasPrice)
                  .multipliedBy(BigNumber(transactions[i].gasUsed))
                  .toString()
              )
            : null,
        input: transactions[i].input,
        contractAddress: transactions[i].contractAddress,
        confirmations: transactions[i].confirmations,
      };
      
      _txs.push(_txObj);
    }
  }

  let _uniqueTxs = new Array();
  _uniqueTxs = Array.from(new Set(_txs.map(JSON.stringify))).map(JSON.parse);

  return _uniqueTxs;
};