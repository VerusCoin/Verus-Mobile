import store from '../../../../store';
import {
  CANCEL_WALLET_UNLOCK,
  CLEAR_WALLET_UNLOCK,
  REQUEST_WALLET_UNLOCK,
  RESOLVE_WALLET_UNLOCK,
} from '../../../../utils/constants/storeType';

export const WALLET_UNLOCK_CANCELLED = 'WALLET_UNLOCK_CANCELLED';

const pendingUnlockRequests = {};
let requestCounter = 0;

const normalizeAccountHashes = accountHashes =>
  Array.isArray(accountHashes) ? accountHashes.filter(Boolean) : null;

const buildWalletUnlockRequest = options => {
  const requestId = `${Date.now()}-${requestCounter++}`;

  return {
    requestId,
    reason: options.reason || null,
    title: options.title || null,
    requestLabel: options.requestLabel || null,
    accountHashes: normalizeAccountHashes(options.accountHashes),
    preferredAccountHash: options.preferredAccountHash || null,
    loadingTitle: options.loadingTitle || null,
    loadingSubtitle: options.loadingSubtitle || null,
    networkLabel: options.networkLabel || null,
  };
};

const rejectPendingUnlock = requestId => {
  const pending = pendingUnlockRequests[requestId];

  if (!pending) return;

  delete pendingUnlockRequests[requestId];

  const error = new Error('Wallet unlock cancelled');
  error.code = WALLET_UNLOCK_CANCELLED;
  pending.reject(error);
};

export const requestWalletUnlock = (options = {}) => {
  const request = buildWalletUnlockRequest(options);

  store.dispatch({
    type: REQUEST_WALLET_UNLOCK,
    payload: request,
  });

  return new Promise((resolve, reject) => {
    pendingUnlockRequests[request.requestId] = {resolve, reject};
  });
};

export const cancelWalletUnlock = requestId => {
  store.dispatch({
    type: CANCEL_WALLET_UNLOCK,
    payload: {requestId},
  });

  rejectPendingUnlock(requestId);
};

export const resolveWalletUnlock = (requestId, account) => {
  store.dispatch({
    type: RESOLVE_WALLET_UNLOCK,
    payload: {requestId},
  });

  const pending = pendingUnlockRequests[requestId];

  if (!pending) return;

  delete pendingUnlockRequests[requestId];
  pending.resolve({
    account,
    accountHash: account ? account.accountHash : null,
  });
};

export const clearWalletUnlock = requestId => {
  store.dispatch({
    type: CLEAR_WALLET_UNLOCK,
    payload: requestId ? {requestId} : {},
  });

  if (requestId) {
    rejectPendingUnlock(requestId);
    return;
  }

  Object.keys(pendingUnlockRequests).forEach(rejectPendingUnlock);
};
