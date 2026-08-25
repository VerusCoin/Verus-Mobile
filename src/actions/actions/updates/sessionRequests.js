import { SESSION_REQUEST_STARTED } from "../../../utils/constants/storeType";

let requestSequence = 0;
const inFlightRequests = new Map();

const createAbortController = () => {
  if (typeof AbortController === "undefined") return null;
  return new AbortController();
};

export const captureSessionScope = (state, expectedAccountHash) => ({
  sessionScoped: true,
  accountHash:
    expectedAccountHash === undefined
      ? state.authentication.activeAccount == null
        ? null
        : state.authentication.activeAccount.accountHash
      : expectedAccountHash,
  sessionEpoch: state.authentication.sessionEpoch || 0,
});

export const sessionScopeIsCurrent = (state, scope) => {
  if (state == null || scope == null || !scope.sessionScoped) return false;

  const activeAccountHash = state.authentication.activeAccount == null
    ? null
    : state.authentication.activeAccount.accountHash;

  return (
    scope.accountHash === activeAccountHash &&
    scope.sessionEpoch === (state.authentication.sessionEpoch || 0)
  );
};

export const sessionActionIsCurrent = (state, action) =>
  action?.meta?.sessionScoped !== true ||
  sessionScopeIsCurrent(state, action.meta);

export const scopeSessionAction = (action, scope) => ({
  ...action,
  meta: {
    ...(action.meta || {}),
    ...scope,
  },
});

export const getContextSessionScope = (
  state,
  requestContext,
  expectedAccountHash,
) =>
  requestContext?.sessionScope ||
  (requestContext?.sessionScoped ? requestContext : null) ||
  captureSessionScope(state, expectedAccountHash);

export const getContextActionScope = (
  state,
  requestContext,
  expectedAccountHash,
) => {
  const sessionScope = getContextSessionScope(
    state,
    requestContext,
    expectedAccountHash,
  );

  if (requestContext?.teardown !== true) return sessionScope;

  return {
    ...sessionScope,
    teardown: true,
    teardownId: requestContext.teardownId,
    ownerAccountHash:
      requestContext.ownerAccountHash == null
        ? sessionScope.accountHash
        : requestContext.ownerAccountHash,
    resourceOwnerAccountHash:
      requestContext.resourceOwnerScope?.accountHash ||
      requestContext.resourceOwnerAccountHash ||
      requestContext.ownerAccountHash ||
      sessionScope.accountHash,
    resourceOwnerSessionEpoch:
      requestContext.resourceOwnerScope?.sessionEpoch ??
      requestContext.resourceOwnerSessionEpoch ??
      sessionScope.sessionEpoch,
  };
};

export const sessionActionMayTeardown = (state, action) =>
  action?.meta?.teardown === true || sessionActionIsCurrent(state, action);

export const signOutCompletionWasAccepted = (state, action) => {
  if (action?.meta?.sessionScoped !== true) return true;

  return (
    state?.authentication?.activeAccount == null &&
    (state.authentication.sessionEpoch || 0) === action.meta.sessionEpoch
  );
};

export const signOutWasAccepted = (state, action) => {
  if (action?.meta?.sessionScoped !== true) return true;

  return (
    state?.authentication?.activeAccount?.accountHash ===
      action.meta.accountHash &&
    (state.authentication.sessionEpoch || 0) === action.meta.sessionEpoch + 1 &&
    state.authentication.signedIn === false
  );
};

export const beginSessionRequest = (state, dispatch, requestKey) => {
  const previous = inFlightRequests.get(requestKey);
  if (previous != null && previous.controller != null) {
    previous.controller.abort();
  }

  const controller = createAbortController();
  const requestId = `${Date.now()}:${++requestSequence}`;
  const meta = {
    ...captureSessionScope(state),
    requestKey,
    requestId,
  };

  inFlightRequests.set(requestKey, {controller, requestId});
  dispatch({
    type: SESSION_REQUEST_STARTED,
    payload: {requestKey, requestId},
    meta,
  });

  return {
    meta,
    signal: controller == null ? undefined : controller.signal,
    complete: () => {
      const current = inFlightRequests.get(requestKey);
      if (current != null && current.requestId === requestId) {
        inFlightRequests.delete(requestKey);
      }
    },
  };
};

export const abortAllSessionRequests = () => {
  for (const request of inFlightRequests.values()) {
    if (request.controller != null) request.controller.abort();
  }

  inFlightRequests.clear();
};
