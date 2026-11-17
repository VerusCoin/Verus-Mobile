import {accountIsTestnet} from '../account/accountNetwork';
import {
  createGenericRequestRejectionError,
  GENERIC_REQUEST_REJECTION_CODES,
} from './genericRequestRejection';

export const getMatchingRequestAccounts = (accounts, requestIsTestnet) => {
  if (!Array.isArray(accounts)) return [];

  return accounts.filter(
    account => accountIsTestnet(account) === requestIsTestnet,
  );
};

export const assertRequestNetworkMatchesAccount = (
  account,
  requestIsTestnet,
) => {
  if (account == null) return;

  const testnetAccount = accountIsTestnet(account);

  if (testnetAccount !== requestIsTestnet) {
    throw createGenericRequestRejectionError(
      GENERIC_REQUEST_REJECTION_CODES.NETWORK_MISMATCH,
      `This request was created for ${
        requestIsTestnet ? 'testnet' : 'mainnet'
      }, but the active profile uses ${
        testnetAccount ? 'testnet' : 'mainnet'
      }. Switch profiles and scan the request again.`,
      {requestIsTestnet},
    );
  }
};
