import store from '../../store';
import {
  scopeSessionAction,
  sessionScopeIsCurrent,
} from '../../actions/actions/updates/sessionRequests';

const getSessionScope = requestContext =>
  requestContext?.sessionScope ||
  (requestContext?.sessionScoped ? requestContext : null);

export const assertClaimMetadataSessionCurrent = requestContext => {
  const sessionScope = getSessionScope(requestContext);

  if (
    requestContext?.signal?.aborted === true ||
    !sessionScopeIsCurrent(store.getState(), sessionScope)
  ) {
    const error = new Error(
      'Account changed while spendable-key claim metadata was being updated.',
    );
    error.code = 'SESSION_CHANGED';
    throw error;
  }

  return sessionScope;
};

export const scopeClaimMetadataAction = (action, requestContext) =>
  scopeSessionAction(
    action,
    assertClaimMetadataSessionCurrent(requestContext),
  );

export const linkClaimedIdentitiesForSession = async ({
  results,
  requestContext,
  activeAccount,
  activeCoinList,
  dispatch,
  linkIdentity,
  updateIdentityWallet,
  clearLifecycle,
  createSetUserCoinsAction,
  refreshLifecycles,
}) => {
  const sessionScope = assertClaimMetadataSessionCurrent(requestContext);

  if (
    activeAccount == null ||
    activeAccount.accountHash !== sessionScope.accountHash
  ) {
    const error = new Error(
      'The spendable-key claim belongs to a different account.',
    );
    error.code = 'SESSION_CHANGED';
    throw error;
  }

  const identityResults = (results || []).filter(
    result => result.type === 'identity',
  );

  if (identityResults.length === 0) return;

  const touchedCoinIds = new Set();
  let missingNameError = null;

  for (const result of identityResults) {
    assertClaimMetadataSessionCurrent(requestContext);
    const fullName = result.identity.fullyQualifiedName;
    if (typeof fullName !== 'string' || !fullName.trim()) {
      missingNameError = missingNameError || new Error(
        `The full name for claimed identity ${result.identity.identityAddress} is unavailable. Link it manually.`,
      );
      continue;
    }

    await linkIdentity(
      result.identity.identityAddress,
      fullName,
      result.coinObj.id,
      requestContext,
    );
    assertClaimMetadataSessionCurrent(requestContext);
    touchedCoinIds.add(result.coinObj.id);
  }

  if (touchedCoinIds.size === 0 && missingNameError) throw missingNameError;

  await updateIdentityWallet(requestContext);
  assertClaimMetadataSessionCurrent(requestContext);

  for (const coinId of touchedCoinIds) {
    assertClaimMetadataSessionCurrent(requestContext);
    clearLifecycle(coinId);
  }

  assertClaimMetadataSessionCurrent(requestContext);
  const setUserCoinsAction = createSetUserCoinsAction(
    activeCoinList,
    activeAccount.id,
  );
  dispatch(scopeSessionAction(setUserCoinsAction, sessionScope));
  assertClaimMetadataSessionCurrent(requestContext);
  refreshLifecycles(setUserCoinsAction.payload.activeCoinsForUser);

  if (missingNameError) throw missingNameError;
};

export const unlinkGiftedIdentitiesForSession = async ({
  identities,
  requestContext,
  activeAccount,
  activeCoinList,
  dispatch,
  unlinkIdentity,
  updateIdentityWallet,
  clearLifecycle,
  createSetUserCoinsAction,
  refreshLifecycles,
}) => {
  const sessionScope = assertClaimMetadataSessionCurrent(requestContext);

  if (
    activeAccount == null ||
    activeAccount.accountHash !== sessionScope.accountHash
  ) {
    const error = new Error(
      'The gifted identities to be unlinked belong to a different account.',
    );
    error.code = 'SESSION_CHANGED';
    throw error;
  }

  const touchedCoinIds = new Set();

  for (const identity of identities) {
    assertClaimMetadataSessionCurrent(requestContext);

    await unlinkIdentity(
      identity.identityAddress,
      identity.chain,
      requestContext,
    );
    assertClaimMetadataSessionCurrent(requestContext);
    touchedCoinIds.add(identity.chain);
  }

  await updateIdentityWallet(requestContext);
  assertClaimMetadataSessionCurrent(requestContext);

  for (const coinId of touchedCoinIds) {
    assertClaimMetadataSessionCurrent(requestContext);
    clearLifecycle(coinId);
  }

  assertClaimMetadataSessionCurrent(requestContext);
  const setUserCoinsAction = createSetUserCoinsAction(
    activeCoinList,
    activeAccount.id,
  );
  dispatch(scopeSessionAction(setUserCoinsAction, sessionScope));
  assertClaimMetadataSessionCurrent(requestContext);
  refreshLifecycles(setUserCoinsAction.payload.activeCoinsForUser);
};
