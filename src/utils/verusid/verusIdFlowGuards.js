import {VRPC} from '../constants/intervalConstants';
import {sessionScopeIsCurrent} from '../../actions/actions/updates/sessionRequests';

/*
  Shared guards for the VerusID linking, unlink, and request-resume flows.

  These decisions are captured as pure functions so the same rule runs in the
  components and in the focused regression tests.
*/

// A discovered or manually resolved VerusID candidate is captured under one
// wallet session. Linking it later must be rejected if that session ended, even
// when the picker sheet stayed mounted or another account happens to use the
// same first R-address. The origin metadata is immutable once captured.
export const captureIdentityLinkOrigin = (
  state,
  {chainId, walletAddress} = {},
) => ({
  accountHash: state?.authentication?.activeAccount?.accountHash ?? null,
  chainId: chainId ?? null,
  sessionEpoch: state?.authentication?.sessionEpoch ?? 0,
  walletAddress: walletAddress ?? null,
});

export const identityLinkOriginIsCurrent = (state, origin) => {
  if (!origin) return false;

  const activeAccountHash =
    state?.authentication?.activeAccount?.accountHash ?? null;

  return (
    origin.accountHash === activeAccountHash &&
    origin.sessionEpoch === (state?.authentication?.sessionEpoch ?? 0)
  );
};

export const getAccountChainAddresses = (state, chainId) => {
  if (!chainId) return null;

  return (
    state?.authentication?.activeAccount?.keys?.[chainId]?.[VRPC]
      ?.addresses || null
  );
};

/*
  The candidate may only link into the account that is current right now: its
  origin chain must match the candidate chain, its chosen primary R-address must
  belong to that account's VRPC address array, and any captured origin wallet
  address must still be owned. This runs in addition to the check that the
  address is one of the identity's own primary addresses.
*/
export const identityLinkCandidateMatchesAccount = (state, candidate) => {
  const chainId = candidate?.chainId;
  const addresses = getAccountChainAddresses(state, chainId);

  if (!Array.isArray(addresses)) return false;
  if (!candidate?.primaryAddress || !addresses.includes(candidate.primaryAddress)) {
    return false;
  }

  if (candidate?.origin?.chainId && candidate.origin.chainId !== chainId) {
    return false;
  }

  if (candidate?.origin?.walletAddress) {
    return addresses.includes(candidate.origin.walletAddress);
  }

  return true;
};

/*
  Combined guard for a candidate that carries origin metadata: the origin
  session must still be live and the chosen address must still belong to the
  current account. Used by the picker immediately before it hands a candidate
  to a parent link handler.
*/
export const identityLinkCandidateIsLinkable = (state, candidate) =>
  identityLinkOriginIsCurrent(state, candidate?.origin) &&
  identityLinkCandidateMatchesAccount(state, candidate);

/*
  A pending-status sheet is opened for an in-progress or failed request. Once a
  refresh makes the request READY - or drops it from the list entirely - the
  sheet has no truthful status left to show and must close so the READY row and
  its Link action take over.
*/
export const pendingStatusSheetShouldDismiss = ({
  selectedPending,
  currentPending,
  readyStatus,
}) => {
  if (!selectedPending) return false;
  if (!currentPending) return true;

  return currentPending.status === readyStatus;
};

/*
  The unlink screen queues `navigation.goBack()` behind the confirmation
  sheet's close animation. When that callback finally runs the wallet session
  or the focused route may have changed, so navigation is only allowed while
  the screen is mounted, the originating session is current, and the screen's
  own route is still the focused one.
*/
export const shouldNavigateAfterUnlinkDismissal = ({
  mounted,
  sessionScope,
  state,
  originatingRouteKey,
  navigationState,
  isFocused,
}) => {
  if (!mounted) return false;
  if (!sessionScopeIsCurrent(state, sessionScope)) return false;
  if (!originatingRouteKey) return false;

  const focusedRoute = navigationState?.routes?.[navigationState?.index];

  if (!focusedRoute || focusedRoute.key !== originatingRouteKey) return false;
  if (isFocused === false) return false;

  return true;
};

/*
  Single-flight owner for the READY resume action.

  The resume guard only clears after the old promise settles, so an unresolved
  run would otherwise lock the component forever. This owner binds the
  in-flight flag and token to the session scope that started the run: a scope
  change invalidates the old token and releases the gate synchronously, so the
  new session may start immediately even though the old run never settles. The
  old run stays inert - only its own still-current token can release the gate,
  so a stale finally cannot clear a newer run.
*/
export const createVerusIdResumeOwner = (initialScope) => {
  const capture = (scope) => ({
    sessionScoped: true,
    accountHash: scope?.accountHash ?? null,
    sessionEpoch: scope?.sessionEpoch ?? 0,
  });

  const sameScope = (a, b) =>
    (a?.accountHash ?? null) === (b?.accountHash ?? null) &&
    (a?.sessionEpoch ?? 0) === (b?.sessionEpoch ?? 0);

  let scope = initialScope ? capture(initialScope) : null;
  let token = 0;
  let activeToken = null;

  // Adopt the scope that owns the run. A different scope invalidates any
  // in-flight run synchronously, which releases the single-flight gate even
  // when that run's promise never settles.
  const invalidateForScope = (nextScope) => {
    if (sameScope(scope, nextScope)) return;

    scope = nextScope ? capture(nextScope) : null;
    activeToken = null;
    token += 1;
  };

  // Returns a non-null token only when no resume is already in flight for the
  // scope captured right now.
  const begin = (nextScope) => {
    invalidateForScope(nextScope);
    if (activeToken !== null) return null;

    token += 1;
    activeToken = token;
    return token;
  };

  // True only while the caller still owns the current run. A superseded run
  // returns false, so its catch/finally cannot reopen a fallback, attach an
  // error, navigate, or clear a newer run's gate.
  const isActive = (candidate) =>
    candidate != null && candidate === activeToken;

  // Release the gate only for the run that still owns it.
  const release = (candidate) => {
    if (!isActive(candidate)) return false;

    activeToken = null;
    return true;
  };

  return {begin, invalidateForScope, isActive, release};
};
