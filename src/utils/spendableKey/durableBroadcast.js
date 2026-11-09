import {Buffer} from 'buffer';
import {Transaction, networks} from '@bitgo/utxo-lib';
import {verifyIdentityUpdateFunding} from 'verusid-ts-client';
import {sha256} from '../crypto/hash';
import {
  getBlock,
  getInfo,
  getTransaction,
  sendRawTransaction,
} from '../api/channels/vrpc/callCreators';
import {
  assertIdentityUpdateContext,
  captureIdentityUpdateContext,
  getIdentityUpdateLockContext,
} from '../identityUpdate/verifiedSubmission';
import {REQUEST_TIMEOUT_MS} from '../../../env/index';

export const BROADCAST_STATUS_PREPARED = 'prepared';
export const BROADCAST_STATUS_SUBMITTED = 'submitted';

const readResult = response => {
  if (response?.error) {
    throw new Error(response.error.message || 'The network request failed.');
  }

  if (!response || !Object.prototype.hasOwnProperty.call(response, 'result')) {
    throw new Error('The network returned an invalid response.');
  }

  return response.result;
};

// Guard both sides of an RPC so a wallet or request change invalidates its reply.
const guardedRead = async (context, read) => {
  assertIdentityUpdateContext(context);

  const response = await read();

  assertIdentityUpdateContext(context);

  return response;
};

// Gift and claim records retain signed transactions. An expired transaction's
// unlock rules must use independently verified inclusion, never saved metadata.
export const resolveIdentityUpdateLockContext = async (context, receipt) => {
  if (context.systemId && context.systemId !== receipt.systemId) {
    throw new Error(
      'The saved identity update belongs to a different network.',
    );
  }

  const chainContext = {...context, systemId: receipt.systemId};
  const active = await getIdentityUpdateLockContext(chainContext);
  const expiry = Transaction.fromHex(receipt.hex, networks.verus).expiryHeight;

  if (
    receipt.status !== BROADCAST_STATUS_SUBMITTED &&
    active.nextBlockHeight <= expiry
  ) {
    return active;
  }

  const response = await guardedRead(context, () =>
    getTransaction(receipt.systemId, receipt.txid, 1),
  );

  if (response?.error?.code === -5) {
    return active.nextBlockHeight <= expiry ? active : undefined;
  }

  const found = readResult(response);

  // Unconfirmed bytes still use the active height while they remain valid.
  if (
    (typeof found === 'string'
      ? found === receipt.signedHex
      : found?.hex === receipt.signedHex) &&
    !found?.blockhash &&
    !(found?.confirmations > 0) &&
    active.nextBlockHeight <= expiry
  ) {
    return active;
  }

  if (
    found?.hex !== receipt.signedHex ||
    found.txid !== receipt.txid ||
    !Number.isSafeInteger(found.confirmations) ||
    found.confirmations < 1 ||
    typeof found.blockhash !== 'string' ||
    !/^[0-9a-f]{64}$/i.test(found.blockhash)
  ) {
    throw new Error(
      'Unable to independently verify the saved update’s historical inclusion height.',
    );
  }

  const block = readResult(
    await guardedRead(context, () =>
      getBlock(receipt.systemId, found.blockhash, 1),
    ),
  );

  if (
    block?.hash !== found.blockhash ||
    !Number.isSafeInteger(block.height) ||
    block.height < 1 ||
    block.height >= active.nextBlockHeight ||
    !Number.isSafeInteger(block.confirmations) ||
    block.confirmations < 1 ||
    !Array.isArray(block.tx) ||
    !block.tx.includes(receipt.txid)
  ) {
    throw new Error(
      'The saved update is not confirmed in the expected active-chain block.',
    );
  }

  // A block hash alone does not prove the transaction is still on the active chain.
  const activeBlock = readResult(
    await guardedRead(context, () =>
      getBlock(receipt.systemId, String(block.height), 1),
    ),
  );

  if (
    activeBlock?.hash !== block.hash ||
    activeBlock.height !== block.height ||
    !Number.isSafeInteger(activeBlock.confirmations) ||
    activeBlock.confirmations < 1
  ) {
    throw new Error(
      'The saved update’s historical block is no longer on the active chain.',
    );
  }

  return {chainId: receipt.systemId, nextBlockHeight: block.height};
};

const getErrorMessage = error => {
  if (error?.error?.message) return error.error.message;

  if (error?.result?.message) return error.result.message;

  if (error?.message) return error.message;

  return String(error || 'Transaction broadcast failed.');
};

export const deriveRawTransactionId = rawTx => {
  if (typeof rawTx !== 'string' || rawTx.length === 0) {
    throw new Error(
      'Cannot derive a transaction ID without a signed transaction.',
    );
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
  ...(input?.script == null ? {} : {script: input.script}),
  ...(input?.satoshis == null ? {} : {satoshis: input.satoshis}),
});

export const verifyPendingIdentityFunding = (transaction, lockContext) => {
  if (transaction.type !== 'identity') return;

  if (
    !transaction.fundingApproval ||
    transaction.fundingApproval.systemId !== transaction.systemId
  ) {
    throw new Error(
      'Missing verified identity funding approval for this network. Review the transaction again.',
    );
  }

  verifyIdentityUpdateFunding(
    transaction.fundingApproval,
    transaction.rawTx || transaction.txHex,
    transaction.inputs,
    lockContext,
  );
};

export const verifyPendingIdentityFundingAtActiveHeight = async transaction => {
  const response = await getInfo(transaction.systemId);
  const info = response?.result;

  if (
    response?.error ||
    info?.chainid !== transaction.systemId ||
    !Number.isSafeInteger(info.blocks) ||
    info.blocks < 0 ||
    info.blocks + 1 >= 500000000
  ) {
    throw new Error('Unable to verify the identity update network and height.');
  }

  const lockContext = {
    chainId: transaction.systemId,
    nextBlockHeight: info.blocks + 1,
  };

  verifyPendingIdentityFunding(transaction, lockContext);

  return lockContext;
};

// Retain the reviewed inputs and approval alongside the exact signed bytes.
export const createPendingBroadcastTransaction = ({transaction, rawTx}) => ({
  type: transaction.type,
  systemId: transaction.systemId,
  coinObj: transaction.coinObj || null,
  identity: transaction.identity || null,
  identitySnapshots: transaction.identitySnapshots || [],
  outputs: transaction.outputs || [],
  deltas:
    transaction.deltas instanceof Map
      ? Object.fromEntries(
          [...transaction.deltas].map(([currency, amount]) => [
            currency,
            amount.toString(),
          ]),
        )
      : transaction.deltas || null,
  fundingApproval:
    transaction.fundingApproval == null
      ? undefined
      : JSON.parse(JSON.stringify(transaction.fundingApproval)),
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

// Resume only the exact signed batch still held by the authoritative store.
export const loadMatchingPendingBroadcast = async (
  pendingBroadcast,
  loadPendingBroadcast,
) => {
  if (typeof loadPendingBroadcast !== 'function') {
    throw new Error(
      'A saved-transaction loader is required to resume this batch.',
    );
  }

  if (
    typeof pendingBroadcast?.id !== 'string' ||
    !pendingBroadcast.id.length ||
    typeof pendingBroadcast.kind !== 'string' ||
    !pendingBroadcast.kind.length ||
    !Array.isArray(pendingBroadcast.transactions) ||
    !pendingBroadcast.transactions.length
  ) {
    throw new Error('The saved transaction batch is incomplete.');
  }

  const {id, kind} = pendingBroadcast;
  const expected = pendingBroadcast.transactions.map(transaction => ({
    type: transaction?.type,
    systemId: transaction?.systemId,
    txid: transaction?.txid,
    rawTx: transaction?.rawTx,
  }));
  const saved = await loadPendingBroadcast(id);

  if (
    saved?.id !== id ||
    saved.kind !== kind ||
    !Array.isArray(saved.transactions) ||
    saved.transactions.length !== expected.length ||
    !expected.every((transaction, index) => {
      const stored = saved.transactions[index];

      return (
        stored?.type === transaction.type &&
        stored?.systemId === transaction.systemId &&
        stored?.txid === transaction.txid &&
        stored?.rawTx === transaction.rawTx
      );
    })
  ) {
    throw new Error(
      'The saved signed transaction batch changed or is no longer available.',
    );
  }

  return saved;
};

const withRequestTimeout = (request, timeoutMs, operation) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Transaction request timeout must be a positive number.');
  }

  let timeoutId;
  const timeoutPromise = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`${operation} timed out after ${timeoutMs}ms.`);

      error.timedOut = true;
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([Promise.resolve(request), timeoutPromise]).finally(
    () => {
      clearTimeout(timeoutId);
    },
  );
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

const validatePendingTransaction = async (
  transaction,
  identityContext,
  forSubmission = false,
  resumeSavedTransactions = false,
) => {
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

  if (transaction.type === 'identity') {
    const savedWithoutApproval =
      resumeSavedTransactions && transaction.fundingApproval == null;

    if (savedWithoutApproval) {
      const signed = Transaction.fromHex(transaction.rawTx, networks.verus);

      if (
        !signed.ins.length ||
        signed.ins.some(input => !input.script?.length)
      ) {
        throw new Error(
          'The saved identity transaction is missing required signatures.',
        );
      }
    }

    const context = identityContext || captureIdentityUpdateContext();
    const chainContext = {...context, systemId: transaction.systemId};
    const lockContext =
      forSubmission || savedWithoutApproval
        ? await getIdentityUpdateLockContext(chainContext)
        : await resolveIdentityUpdateLockContext(chainContext, {
            systemId: transaction.systemId,
            signedHex: transaction.rawTx,
            txid: transaction.txid,
            hex: transaction.rawTx,
            status: transaction.status,
          });

    if (forSubmission) {
      const expiry = Transaction.fromHex(
        transaction.rawTx,
        networks.verus,
      ).expiryHeight;

      if (!expiry || lockContext.nextBlockHeight >= expiry) {
        throw new Error(
          'The reviewed identity transaction expired before submission. Check delivery of the saved update.',
        );
      }
    }

    // Released receipts predate funding approvals. Their signed bytes may be
    // reconciled after expiry, but can only be submitted while still valid.
    if (!savedWithoutApproval)
      verifyPendingIdentityFunding(transaction, lockContext);
  }
};

const transactionWasAlreadySubmitted = transaction =>
  transaction.status === BROADCAST_STATUS_SUBMITTED;

/**
 * Broadcasts already-signed transactions. The complete signed batch must be
 * durably persisted before this function broadcasts its first transaction.
 */
export const broadcastPendingTransactions = async ({
  pendingBroadcast,
  persistPendingBroadcast,
  requestTimeoutMs = REQUEST_TIMEOUT_MS,
  beforeSend,
  assertCurrent,
  identityContext,
  resumeSavedTransactions = false,
}) => {
  if (typeof persistPendingBroadcast !== 'function') {
    throw new Error(
      'A durable pending-transaction store is required before broadcasting.',
    );
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

  // Validate the whole batch before saving it or attempting any new broadcasts.
  for (const transaction of currentBroadcast.transactions) {
    await validatePendingTransaction(
      transaction,
      identityContext,
      false,
      resumeSavedTransactions,
    );
  }

  if (assertCurrent) assertCurrent();

  await persistPendingBroadcast(currentBroadcast);

  for (let index = 0; index < currentBroadcast.transactions.length; index++) {
    let transaction = currentBroadcast.transactions[index];

    if (assertCurrent) assertCurrent();

    // Do not rebroadcast transactions already known to be accepted.
    if (transactionWasAlreadySubmitted(transaction)) {
      results.push(toResult(transaction));
      continue;
    }

    let response;
    let broadcastError = null;

    // An interrupted send may already have succeeded. Reconcile the retained
    // exact transaction before considering another submission of those bytes.
    if (transaction.broadcastAttempted || resumeSavedTransactions) {
      try {
        const found = await withRequestTimeout(
          getTransaction(transaction.systemId, transaction.txid, 0),
          requestTimeoutMs,
          'Transaction lookup',
        );

        if (assertCurrent) assertCurrent();

        const hex =
          typeof found?.result === 'string' ? found.result : found?.result?.hex;

        if (
          hex === transaction.rawTx &&
          deriveRawTransactionId(hex) === transaction.txid
        ) {
          transaction = {
            ...transaction,
            status: BROADCAST_STATUS_SUBMITTED,
            submittedAt: Date.now(),
          };

          currentBroadcast = replaceTransaction(
            currentBroadcast,
            index,
            transaction,
          );

          await persistPendingBroadcast(currentBroadcast);
          results.push(toResult(transaction));

          continue;
        }

        if (found?.error?.code !== -5)
          throw new Error(
            'The network could not confirm whether the saved transaction was submitted.',
          );
      } catch (error) {
        error.pendingBroadcast = currentBroadcast;
        error.results = results;
        if (error.code !== 'SESSION_CHANGED') error.code = 'BROADCAST_UNKNOWN';

        throw error;
      }
    }

    // Recheck the reviewed transaction immediately before marking the attempt.
    if (beforeSend) await beforeSend(transaction, currentBroadcast);

    await validatePendingTransaction(
      transaction,
      identityContext,
      true,
      resumeSavedTransactions,
    );

    transaction = {...transaction, broadcastAttempted: true};
    currentBroadcast = replaceTransaction(currentBroadcast, index, transaction);
    await persistPendingBroadcast(currentBroadcast);

    // Persistence may involve authentication. Validate again after it returns.
    if (beforeSend) await beforeSend(transaction, currentBroadcast);

    await validatePendingTransaction(
      transaction,
      identityContext,
      true,
      resumeSavedTransactions,
    );

    if (assertCurrent) assertCurrent();

    // The RPC call hands off the bytes; only a matching reply acknowledges them.
    try {
      response = await withRequestTimeout(
        sendRawTransaction(transaction.systemId, transaction.rawTx),
        requestTimeoutMs,
        'Transaction broadcast',
      );

      if (assertCurrent) assertCurrent();

      if (response?.error != null) {
        broadcastError = new Error(getErrorMessage(response));
      } else if (
        typeof response?.result !== 'string' ||
        response.result.length === 0
      ) {
        broadcastError = new Error(
          'Transaction broadcast returned no transaction ID.',
        );
      } else if (
        response.result.toLowerCase() !== transaction.txid.toLowerCase()
      ) {
        broadcastError = new Error(
          'Transaction broadcast returned an unexpected transaction ID.',
        );
      }
    } catch (error) {
      broadcastError =
        error instanceof Error ? error : new Error(getErrorMessage(error));
    }

    if (broadcastError == null) {
      transaction = {
        ...transaction,
        status: BROADCAST_STATUS_SUBMITTED,
        submittedAt: Date.now(),
      };

      currentBroadcast = replaceTransaction(
        currentBroadcast,
        index,
        transaction,
      );
      results.push(toResult(transaction));

      try {
        await persistPendingBroadcast(currentBroadcast);
      } catch (persistenceError) {
        const durableError =
          persistenceError instanceof Error
            ? persistenceError
            : new Error(getErrorMessage(persistenceError));

        durableError.results = results;
        durableError.pendingBroadcast = currentBroadcast;
        Object.assign(durableError, {submitted: true, txid: transaction.txid});

        throw durableError;
      }

      continue;
    }

    // A failed reply cannot undo handoff; retain the local txid and partial results.
    broadcastError.results = results;
    broadcastError.pendingBroadcast = currentBroadcast;
    Object.assign(broadcastError, {submitted: true, txid: transaction.txid});
    if (broadcastError.code !== 'SESSION_CHANGED')
      broadcastError.code = 'BROADCAST_UNKNOWN';

    throw broadcastError;
  }

  return {
    pendingBroadcast: currentBroadcast,
    results,
  };
};
