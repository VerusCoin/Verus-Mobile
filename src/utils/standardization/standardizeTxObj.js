import BigNumber from "bignumber.js";
import { ETHERS } from "../constants/web3Constants";
import { unitsToCoins, weiToCoins } from "../math";
import { decodeMemo } from "../memoUtils";
import { RESERVE_TRANSFER_DESTINATION } from "verus-typescript-primitives";
import { satsToCoins } from '../math'
import { ETH } from "../constants/intervalConstants";

// Makes transaction objects from lightwalletd client resemble those from electrum,
// for predictable, standard behaviour
export const standardizeDlightTxObj = (txObj) => {
  const { address, amount, category, height, status, time, txid, memos } = txObj

  // normalize memo, remove duplicates if they exist
  const normalizedMemo =
    Array.isArray(memos)
      ? memos.find(m => typeof m === "string" && m.trim().length > 0) ?? null
      : null;

  return {
    address,
    amount: typeof amount !== "string" ? satsToCoins(BigNumber(amount.toString())) : satsToCoins(BigNumber(amount)),
    type: category,
    confirmed: status === "pending" || height < 0 ? false : true,
    height,
    status,
    timestamp: time,
    txid,
    memo: normalizedMemo,
  };
}

export const standardizeEthTxObj = (transactions, address, decimals = ETHERS, tokenTxs) => {
  let _txs = [];

  if (transactions.length) {
    for (let i = 0; i < transactions.length; i++) {
      let type;

      const amount = transactions[i].value != null && typeof transactions[i].value === 'string'
        ? unitsToCoins(BigNumber(transactions[i].value), decimals).toString()
        : null

      if (tokenTxs && (amount == null || amount == "0")) {
        type = 'unknown';
      } else if (transactions[i].from === transactions[i].to) {
        type = 'self';
      } else if (transactions[i].from && transactions[i].from.toLowerCase() === address.toLowerCase()) {
        type = 'sent';                    
      } else if (transactions[i].to && transactions[i].to.toLowerCase() === address.toLowerCase()) {
        type = 'received';                    
      }

      let _txObj = {
        type,
        height: Number(transactions[i].blockNumber),
        timestamp: Number(transactions[i].timeStamp),
        txid: transactions[i].hash,
        nonce: transactions[i].nonce,
        blockhash: transactions[i].blockHash,
        txindex: transactions[i].transactionIndex,
        src: transactions[i].from,
        address: transactions[i].to,
        amount,
        gas:
          transactions[i].gas != null && typeof transactions[i].gas === 'string'
            ? weiToCoins(BigNumber(transactions[i].gas)).toString()
            : null,
        gasPrice:
          transactions[i].gasPrice != null && typeof transactions[i].gasPrice === 'string'
            ? weiToCoins(BigNumber(transactions[i].gasPrice)).toString()
            : null,
        cumulativeGasUsed:
          transactions[i].cumulativeGasUsed != null && typeof transactions[i].cumulativeGasUsed === 'string'
            ? weiToCoins(BigNumber(transactions[i].cumulativeGasUsed)).toString()
            : null,
        gasUsed:
          transactions[i].gasUsed != null && typeof transactions[i].gasUsed === 'string'
            ? weiToCoins(BigNumber(transactions[i].gasUsed)).toString()
            : null,
        fee:
          transactions[i].gasPrice != null && typeof transactions[i].gasPrice === 'string' &&
          transactions[i].gasUsed != null && typeof transactions[i].gasUsed === 'string'
            ? weiToCoins(
                BigNumber(transactions[i].gasPrice)
                  .multipliedBy(BigNumber(transactions[i].gasUsed))
              ).toString()
            : null,
        feeCurr: ETH.toUpperCase(),
        input: transactions[i].input,
        contractAddress: transactions[i].contractAddress,
        confirmed:
          transactions[i].confirmations != null &&
          BigInt(transactions[i].confirmations) > BigInt(0)
            ? true
            : false,
        confirmations: transactions[i].confirmations,
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

const toAddressList = addresses =>
  Array.isArray(addresses)
    ? addresses.filter(x => typeof x === 'string')
    : typeof addresses === 'string'
      ? [addresses]
      : [];

// Network fees stay far below this. Registration prices start above it.
const MIN_REGISTRATION_COST = BigNumber('0.01');

export const standardizeVrpcTxObj = (transaction, coinObj, currHeight, systemId) => {
  const {amount, txid, height, address, blocktime, sent, mempool, timestamp} = transaction;
  const amountBn = BigNumber(amount)
  let timeEstimate;

  if (!blocktime && timestamp == null && !mempool && currHeight && height) {
    const confirmations = BigNumber(currHeight).minus(BigNumber(height));
    const currTime = BigNumber(new Date().getTime()).dividedBy(BigNumber(1000));

    timeEstimate = currTime
      .minus(confirmations.multipliedBy(BigNumber(coinObj.seconds_per_block)))
      .toNumber();
  }

  let type = amountBn.isGreaterThan(0) ? 'received' : 'sent';
  let fee = null;
  let addresses = [address];

  // A spend lists every output of the transaction. Outputs back to this
  // address are change, so the recipients are the other outputs, and the
  // rest of what left this address is the network fee.
  if (sent && type === 'sent') {
    const outputs = (sent.outputs || []).filter(out => {
      const outAddresses = toAddressList(out.addresses);
      return outAddresses.length > 0 && !outAddresses.every(x => x === address);
    });
    const currencyId = coinObj.currency_id;
    const recipientAmount = outputs.reduce(
      (sum, out) => sum.plus(BigNumber(out.amounts?.[currencyId] || 0)),
      BigNumber(0),
    );

    addresses = [...new Set(outputs.flatMap(out => toAddressList(out.addresses)))];

    if (!recipientAmount.isGreaterThan(0)) {
      // Only the fee left in this currency: the transaction moved another
      // currency or an identity, or went back to this address.
      type = 'self';
    } else if (currencyId === systemId) {
      const txFee = amountBn.abs().minus(recipientAmount);
      if (txFee.isGreaterThan(0)) fee = txFee.toString();
    }
  }

  // Filter out the reserve transfer address. A conversion or a send to self
  // then names this address, as before.
  const reserveTransferAddress = RESERVE_TRANSFER_DESTINATION.getAddressString()
  addresses = addresses.filter(x => {
    return typeof x === 'string' && x !== reserveTransferAddress
  })
  if (addresses.length === 0 && typeof address === 'string') addresses = [address];

  // Verbose address deltas already carry decoded output functions. An
  // identity update/transfer has `identity` alone, so only a reservation or
  // commitment identifies registration work. No transaction lookup is needed.
  const functions = Array.isArray(sent?.outputfunctions) ? sent.outputfunctions : [];
  const reservation = functions.find(output => output?.identityregistration)?.identityregistration;
  const commitment = functions.some(output => output?.identitycommitment != null);
  let identityRegistration = reservation && typeof reservation === 'object'
    ? {kind: 'registration', name: reservation.name, systemId}
    : commitment ? {kind: 'commitment', systemId} : null;

  // Some servers send no output functions. A new identity output is a zero
  // value output to an i-address. With a cost well above a network fee, the
  // spend is a registration, not an identity update.
  if (!identityRegistration && sent && type !== 'received' && coinObj.currency_id === systemId) {
    const createsIdentity = (sent.outputs || []).some(out => {
      const outAddresses = toAddressList(out.addresses);
      return outAddresses.length > 0 &&
        outAddresses.every(x => typeof x === 'string' && x.startsWith('i') && x !== address) &&
        BigNumber(out.amounts?.[systemId] || 0).isZero();
    });
    const cost = type === 'self' ? amountBn.abs() : BigNumber(fee || 0);
    if (createsIdentity && cost.isGreaterThanOrEqualTo(MIN_REGISTRATION_COST)) {
      identityRegistration = {kind: 'registration', systemId};
    }
  }

  const blockConfirmations = !mempool && Number.isSafeInteger(Number(currHeight)) &&
    Number.isSafeInteger(Number(height)) && Number(currHeight) >= Number(height)
    ? Number(currHeight) - Number(height) + 1
    : undefined;

  return {
    address: addresses.length === 0 ? null : addresses.join(' & '),
    amount: amountBn.abs().toString(),
    fee,
    type,
    confirmed: mempool ? false : true,
    confirmations: transaction.confirmations ?? blockConfirmations,
    identityRegistration,
    height,
    timestamp: blocktime || timestamp || timeEstimate,
    txid,
  };
};
