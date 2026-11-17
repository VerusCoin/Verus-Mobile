export const COMMITMENT_SLOW_AFTER_MS = 3 * 60 * 1000;

export const registrationCommitmentWaitMessage = (broadcastAt, now = Date.now()) =>
  Number.isFinite(broadcastAt) && now - broadcastAt >= COMMITMENT_SLOW_AFTER_MS
    ? 'Sent. Still waiting for 1 block confirmation. This can take a while.'
    : 'Sent. Needs 1 block confirmation.';

// The SDK keeps the server's refusal inside an uncertain-broadcast error.
// Translate known reasons; never persist or display raw server text.
export const registrationBroadcastRefusal = error => {
  const refusal = error?.details?.response?.error;
  if (!refusal) return null;
  const message = String(refusal.message || '');
  if (/insufficient funds|not enough funds/i.test(message)) {
    return 'The payment address needs more funds for the network fee. Check its status before you retry sending it.';
  }
  if (/missing(?: or spent)? inputs|inputs?.*spent|bad-txns-inputs-missingorspent/i.test(message)) {
    return 'The funds for this transaction are no longer available. Check its status before you retry sending it.';
  }
  if (/fee.*(?:low|small|insufficient)|(?:low|insufficient).*fee/i.test(message)) {
    return 'The network did not accept the transaction fee. Check its status before you retry sending it.';
  }
  if (/expir/i.test(message)) {
    return 'The transaction expired. Check its status before you review a new transaction.';
  }
  return 'The network refused this transaction. Check its status before you retry sending it.';
};
