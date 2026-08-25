import { SESSION_REQUEST_STARTED } from '../utils/constants/storeType';

export const shouldRejectSessionAction = (state, action) => {
  const meta = action.meta;
  if (state == null || meta == null || !meta.sessionScoped) return false;

  const activeAccount = state.authentication.activeAccount;
  const activeAccountHash =
    activeAccount == null ? null : activeAccount.accountHash;

  if (
    meta.accountHash !== activeAccountHash ||
    meta.sessionEpoch !== (state.authentication.sessionEpoch || 0)
  ) {
    return true;
  }

  if (action.type === SESSION_REQUEST_STARTED) return false;

  const hasRequestKey = typeof meta.requestKey === 'string';
  const hasRequestId = typeof meta.requestId === 'string';

  // Simple session-scoped completions only need account/epoch isolation.
  // Refresh requests additionally use request IDs to reject an older result
  // from the same account and epoch.
  if (!hasRequestKey && !hasRequestId) return false;
  if (!hasRequestKey || !hasRequestId) return true;

  const latestRequest =
    state.updates == null || state.updates.latestSessionRequests == null
      ? null
      : state.updates.latestSessionRequests[meta.requestKey];

  return latestRequest !== meta.requestId;
};
