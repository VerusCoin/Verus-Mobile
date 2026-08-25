import {Buffer} from 'buffer';
import {Transaction, networks} from '@bitgo/utxo-lib';
import {sha256} from '../crypto/hash';
import {sendRawTransaction} from '../api/channels/vrpc/callCreators';
import {REQUEST_TIMEOUT_MS} from '../../../env/index';

export const BROADCAST_STATUS_PREPARED = 'prepared';
export const BROADCAST_STATUS_SUBMITTED = 'submitted';

const getErrorMessage = error => {
  if (error?.error?.message) return error.error.message;
  if (error?.result?.message) return error.result.message;
  if (error?.message) return error.message;
  return String(error || 'Transaction broadcast failed.');
};

export const deriveRawTransactionId = rawTx => {
  if (typeof rawTx !== 'string' || rawTx.length === 0) {
    throw new Error('Cannot derive a transaction ID without a signed transaction.');
  }

  return Transaction.fromHex(rawTx, networks.verus).getId();
};

const getPersistableInput = input => ({
  txid: input?.txid || null,
  outputIndex:
    input?.outputIndex != null
      ? input.outputIndex
      : input?.vout != null
      ? input.vout
      : null,
  address: input?.address || null,
});

export const createPendingBroadcastTransaction = ({transaction, rawTx}) => ({
  type: transaction.type,
  systemId: transaction.systemId,
  coinObj: transaction.coinObj || null,
  identity: transaction.identity || null,
  outputs: transaction.outputs || [],
  deltas: transaction.deltas || null,
  includesSweep: transaction.includesSweep === true,
  requestIsTestnet: transaction.requestIsTestnet === true,
  usesIdentityFeeFunds: transaction.usesIdentityFeeFunds === true,
  inputs: (transaction.inputs || []).map(getPersistableInput),
  rawTx,
  txid: deriveRawTransactionId(rawTx),
  status: BROADCAST_STATUS_PREPARED,
});

export const createPendingBroadcast = ({
  kind,
  transactions,
  ownerAccountHash = null,
  ownerWalletBinding = null,
}) => {
  const createdAt = Date.now();
  const transactionIds = transactions.map(transaction => transaction.txid);
  const id = sha256(
    Buffer.from(`${kind}:${transactionIds.join(':')}`, 'utf8'),
  ).toString('hex');

  return {
    id,
    kind,
    ...(ownerAccountHash == null ? {} : {ownerAccountHash}),
    ...(ownerWalletBinding == null ? {} : {ownerWalletBinding}),
    createdAt,
    updatedAt: createdAt,
    transactions,
  };
};

const withRequestTimeout = (request, timeoutMs, operation) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Transaction request timeout must be a positive number.');
  }

  let timeoutId;
  const timeoutPromise = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(
        `${operation} timed out after ${timeoutMs}ms.`,
      );

      error.timedOut = true;
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([Promise.resolve(request), timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};

const replaceTransaction = (pendingBroadcast, index, transaction) => ({
  ...pendingBroadcast,
  updatedAt: Date.now(),
  transactions: pendingBroadcast.transactions.map((current, currentIndex) =>
    currentIndex === index ? transaction : current,
  ),
});

const toResult = transaction => ({
  ...transaction,
});

const validatePendingTransaction = transaction => {
  if (
    typeof transaction?.systemId !== 'string' ||
    transaction.systemId.length === 0
  ) {
    throw new Error('A pending transaction is missing its system ID.');
  }

  if (typeof transaction?.txid !== 'string' || transaction.txid.length === 0) {
    throw new Error('A pending transaction is missing its transaction ID.');
  }

  const derivedTxid = deriveRawTransactionId(transaction.rawTx);

  if (derivedTxid.toLowerCase() !== transaction.txid.toLowerCase()) {
    throw new Error(
      'A saved pending transaction does not match its signed transaction ID.',
    );
  }
};

const transactionWasAlreadySubmitted = transaction =>
  transaction.status === BROADCAST_STATUS_SUBMITTED;

/**
 * Broadcasts already-signed transactions. The complete signed batch must be
 * durably persisted before this function performs its first network call.
 */
export const broadcastPendingTransactions = async ({
  pendingBroadcast,
  persistPendingBroadcast,
  requestTimeoutMs = REQUEST_TIMEOUT_MS,
}) => {
  if (typeof persistPendingBroadcast !== 'function') {
    throw new Error('A durable pending-transaction store is required before broadcasting.');
  }

  if (
    pendingBroadcast == null ||
    !Array.isArray(pendingBroadcast.transactions) ||
    pendingBroadcast.transactions.length === 0
  ) {
    throw new Error('No signed transactions are available to broadcast.');
  }

  let currentBroadcast = pendingBroadcast;
  const results = [];

  for (const transaction of currentBroadcast.transactions) {
    validatePendingTransaction(transaction);
  }

  await persistPendingBroadcast(currentBroadcast);

  for (let index = 0; index < currentBroadcast.transactions.length; index++) {
    let transaction = currentBroadcast.transactions[index];

    // Do not rebroadcast transactions already known to be accepted.
    if (transactionWasAlreadySubmitted(transaction)) {
      results.push(toResult(transaction));
      continue;
    }

    let response;
    let broadcastError = null;

    try {
      response = await withRequestTimeout(
        sendRawTransaction(transaction.systemId, transaction.rawTx),
        requestTimeoutMs,
        'Transaction broadcast',
      );

      if (response?.error != null) {
        broadcastError = new Error(getErrorMessage(response));
      } else if (typeof response?.result !== 'string' || response.result.length === 0) {
        broadcastError = new Error('Transaction broadcast returned no transaction ID.');
      } else if (response.result.toLowerCase() !== transaction.txid.toLowerCase()) {
        broadcastError = new Error('Transaction broadcast returned an unexpected transaction ID.');
      }
    } catch (error) {
      broadcastError = error instanceof Error
        ? error
        : new Error(getErrorMessage(error));
    }

    if (broadcastError == null) {
      transaction = {
        ...transaction,
        status: BROADCAST_STATUS_SUBMITTED,
        submittedAt: Date.now(),
      };
      currentBroadcast = replaceTransaction(currentBroadcast, index, transaction);
      results.push(toResult(transaction));

      try {
        await persistPendingBroadcast(currentBroadcast);
      } catch (persistenceError) {
        const durableError = persistenceError instanceof Error
          ? persistenceError
          : new Error(getErrorMessage(persistenceError));

        durableError.results = results;
        durableError.pendingBroadcast = currentBroadcast;
        throw durableError;
      }

      continue;
    }

    broadcastError.results = results;
    broadcastError.pendingBroadcast = currentBroadcast;
    throw broadcastError;
  }

  return {
    pendingBroadcast: currentBroadcast,
    results,
  };
};
