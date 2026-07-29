export const reconcileSpendableKeyClaimResults = async ({
  results,
  linkClaimedIdentities,
  addMissingRedeemedCurrencies,
}) => {
  let identityLinkError = null;
  let currencyAddError = null;

  try {
    await linkClaimedIdentities(results);
  } catch (e) {
    identityLinkError = e;
  }

  try {
    await addMissingRedeemedCurrencies(results);
  } catch (e) {
    currencyAddError = e;
  }

  return {
    identityLinkError,
    currencyAddError,
  };
};
