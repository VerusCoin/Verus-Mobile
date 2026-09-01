export const isTestProfile = account => {
  return Object.keys(account?.testnetOverrides || {}).length > 0;
};

export const getMatchingRequestAccounts = (accounts, requestIsTestnet) => {
  if (!Array.isArray(accounts)) return [];

  return accounts.filter(
    account => isTestProfile(account) === requestIsTestnet,
  );
};

export const assertRequestNetworkMatchesAccount = (
  account,
  requestIsTestnet,
) => {
  if (account == null) return;

  const accountIsTestnet = isTestProfile(account);

  if (accountIsTestnet !== requestIsTestnet) {
    throw new Error(
      `This request was created for ${
        requestIsTestnet ? 'testnet' : 'mainnet'
      }, but the active profile uses ${
        accountIsTestnet ? 'testnet' : 'mainnet'
      }. Switch profiles and scan the request again.`,
    );
  }
};
