import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import { estimateBlocktimeAtHeight } from "../block";
import { getCoinIdFromSystemId } from "../CoinData/CoinData";
import { ETHERS } from "../constants/web3Constants";
import { satsToCoins } from "../math";
import { decodeMemo } from "../memoUtils";
const { formatEther, formatUnits } = ethers.utils

// Makes transaction objects from lightwalletd client resemble those from electrum,
// for predictable, standard behaviour
export const standardizeDlightTxObj = (txObj) => {
  const { address, amount, category, height, status, time, txid, memo } = txObj
  return {
    address,
    amount: typeof amount !== "string" ? amount.toString() : amount,
    type: category,
    confirmed: status === "pending" || height < 0 ? false : true,
    height,
    status,
    timestamp: time,
    txid,
    memo: decodeMemo(memo),
  };
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
        confirmed:
          transactions[i].confirmations != null &&
          transactions[i].confirmations > 0
            ? true
            : false,
      };
      
      _txs.push(_txObj);
    }
  }

  let _uniqueTxs = new Array();
  _uniqueTxs = Array.from(new Set(_txs.map(JSON.stringify))).map(JSON.parse);

  return _uniqueTxs;
};

export const standardizeWyreTxObj = (transaction, accountAddress, coinObj) => {
  const type = transaction.type === "EXCHANGE"
  ? transaction.sourceCurrency === coinObj.currency_id
    ? "sent"
    : "received"
  : transaction.type === "INCOMING"
  ? "received"
  : "sent"

  return {
    type,
    height: transaction.blockNumber,
    timestamp: transaction.createdAt / 1000,
    txid: transaction.id,
    blockchainTxId: transaction.blockchainTxId,
    src: transaction.sourceName,
    address: transaction.type === "INCOMING" ? accountAddress : transaction.destName,
    amount:
      type === "sent" ? transaction.sourceAmount.toString() : transaction.destAmount.toString(),
    confirmed: transaction.status === "COMPLETED",
    deposit:
      transaction.status === "PENDING" &&
      transaction.source != null &&
      transaction.source.split(":")[0] === "paymentmethod",
  };
};

export const standardizeVrpcTxObj = (transaction, coinObj, currHeight) => {
  const {satoshis, txid, height, address, blocktime, sent, mempool} = transaction;
  let timeEstimate;

  if (!blocktime && currHeight && height) {
    const confirmations = BigNumber(currHeight).minus(BigNumber(height));
    const currTime = BigNumber(new Date().getTime()).dividedBy(BigNumber(1000));

    timeEstimate = currTime
      .minus(confirmations.multipliedBy(BigNumber(coinObj.seconds_per_block)))
      .toNumber();
  }

  let addresses = [];

  if (sent) {
    for (const out of sent.outputs) {
      if (Array.isArray(out.addresses))
        addresses = [...new Set([...addresses, ...out.addresses])];
      else if (!addresses.includes(out.addresses))
        addresses.push(out.addresses);
    }
  } else addresses = [address];

  return {
    address: addresses.length === 0 ? null : addresses.sort((a, b) => {
      if (b !== address) return 1;
      else return -1;
    }).join(' & '),
    amount: satsToCoins(BigNumber(satoshis).abs()).toString(),
    type: satoshis >= 0 ? 'received' : 'sent',
    confirmed: mempool ? false : true,
    height,
    timestamp: blocktime ? blocktime : timeEstimate,
    txid,
  };
};