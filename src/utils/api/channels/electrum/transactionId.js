import {Transaction} from 'bitgo-utxo-lib';

const Buffer = require('safe-buffer').Buffer;
const HEX_TRANSACTION_ID = /^[0-9a-f]{64}$/i;

/**
 * The legacy BitGo fork can expose getId() as 32 comma-separated decimal
 * bytes. Normalize that representation so supported legacy transactions can
 * be compared with the hexadecimal transaction IDs returned by Electrum.
 */
export const normalizeParsedTransactionId = transactionId => {
  if (typeof transactionId !== 'string') {
    throw new Error('Parsed transaction returned an invalid transaction ID.');
  }

  if (HEX_TRANSACTION_ID.test(transactionId)) {
    return transactionId.toLowerCase();
  }

  const decimalBytes = transactionId.split(',');

  if (
    decimalBytes.length !== 32 ||
    decimalBytes.some(byte => !/^\d{1,3}$/.test(byte))
  ) {
    throw new Error('Parsed transaction returned an invalid transaction ID.');
  }

  const byteValues = decimalBytes.map(Number);

  if (byteValues.some(byte => byte < 0 || byte > 255)) {
    throw new Error('Parsed transaction returned an invalid transaction ID.');
  }

  return Buffer.from(byteValues).toString('hex');
};

export const getParsedTransactionId = transaction => {
  if (transaction == null || typeof transaction.getId !== 'function') {
    throw new Error('Unable to derive a transaction ID from parsed transaction data.');
  }

  return normalizeParsedTransactionId(transaction.getId());
};

export const parseRawTransaction = (rawTransaction, network) => {
  if (typeof rawTransaction !== 'string' || rawTransaction.length === 0) {
    throw new Error('Cannot parse an empty raw transaction.');
  }

  return Transaction.fromHex(rawTransaction, network);
};

export const parseAndVerifyRawTransaction = (
  rawTransaction,
  expectedTransactionId,
  network,
) => {
  if (!HEX_TRANSACTION_ID.test(expectedTransactionId || '')) {
    throw new Error('Expected transaction ID is invalid.');
  }

  const transaction = parseRawTransaction(rawTransaction, network);
  const parsedTransactionId = getParsedTransactionId(transaction);

  if (parsedTransactionId !== expectedTransactionId.toLowerCase()) {
    throw new Error(
      'Mismatch error! Raw transaction data does not match its expected transaction ID.',
    );
  }

  return transaction;
};
