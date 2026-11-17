import {getAccountLastOpenedTimestamp} from './accountActivity';

export const WALLET_NETWORKS = {
  MAINNET: 'mainnet',
  TESTNET: 'testnet',
};

export const getWalletNetworkKey = testProfile =>
  testProfile ? WALLET_NETWORKS.TESTNET : WALLET_NETWORKS.MAINNET;

export const getWalletNetworkLabel = networkKey =>
  networkKey === WALLET_NETWORKS.TESTNET ? 'Testnet' : 'Mainnet';

export const accountIsTestnet = account =>
  !!(
    account &&
    account.testnetOverrides &&
    Object.keys(account.testnetOverrides).length > 0
  );

export const getAccountNetworkKey = account =>
  accountIsTestnet(account)
    ? WALLET_NETWORKS.TESTNET
    : WALLET_NETWORKS.MAINNET;

export const accountMatchesNetwork = (account, networkKey) =>
  !!account && getAccountNetworkKey(account) === networkKey;

export const filterAccountsForNetwork = (accounts, networkKey) =>
  (Array.isArray(accounts) ? accounts : []).filter(account =>
    accountMatchesNetwork(account, networkKey),
  );

export const resolveLegacyWalletPriorityHash = (
  accounts,
  generalWalletSettings = {},
  networkKey,
  lastOpenedAccountTimestamps = {},
) => {
  const networkAccounts = (Array.isArray(accounts) ? accounts : []).filter(
    account => accountMatchesNetwork(account, networkKey),
  );

  if (
    networkAccounts.some(
      account =>
        getAccountLastOpenedTimestamp(
          account,
          lastOpenedAccountTimestamps,
        ) != null,
    )
  ) {
    return null;
  }

  const defaultsByNetwork =
    generalWalletSettings.defaultAccountsByNetwork != null &&
    typeof generalWalletSettings.defaultAccountsByNetwork === 'object'
      ? generalWalletSettings.defaultAccountsByNetwork
      : {};
  const networkDefault = defaultsByNetwork[networkKey];
  const legacyDefault = generalWalletSettings.defaultAccount;
  const networkAccountHashes = new Set(
    networkAccounts.map(account => account.accountHash),
  );
  const legacyPriorityHashes = [networkDefault, legacyDefault].filter(
    accountHash => typeof accountHash === 'string',
  );
  const legacyPriorityHash = legacyPriorityHashes.find(accountHash =>
    networkAccountHashes.has(accountHash),
  );

  return legacyPriorityHash || null;
};
