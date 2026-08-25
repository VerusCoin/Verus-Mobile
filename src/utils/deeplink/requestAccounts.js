export const isTestProfile = account => {
  return Object.keys(account?.testnetOverrides || {}).length > 0;
};

export const getMatchingRequestAccounts = (accounts, requestIsTestnet) => {
  if (!Array.isArray(accounts)) return [];

  return accounts.filter(
    account => isTestProfile(account) === requestIsTestnet,
  );
};
