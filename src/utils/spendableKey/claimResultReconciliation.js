export const reconcileSpendableKeyClaimResults = async ({
  results,
  linkClaimedIdentities,
  addMissingRedeemedCurrencies,
  requestContext,
}) => {
  let identityLinkError = null;
  let currencyAddError = null;

  try {
    if (requestContext == null) {
      await linkClaimedIdentities(results);
    } else {
      await linkClaimedIdentities(results, requestContext);
    }
  } catch (e) {
    if (e?.code === 'SESSION_CHANGED') throw e;
    identityLinkError = e;
  }

  try {
    if (requestContext == null) {
      await addMissingRedeemedCurrencies(results);
    } else {
      await addMissingRedeemedCurrencies(results, requestContext);
    }
  } catch (e) {
    if (e?.code === 'SESSION_CHANGED') throw e;
    currencyAddError = e;
  }

  return {
    identityLinkError,
    currencyAddError,
  };
};
