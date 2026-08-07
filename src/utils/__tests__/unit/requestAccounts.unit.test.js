import {getMatchingRequestAccounts} from '../../deeplink/requestAccounts';

describe('request account selection', () => {
  const mainnetAccount = {
    accountHash: 'mainnet-account',
    testnetOverrides: {},
  };
  const testnetAccount = {
    accountHash: 'testnet-account',
    testnetOverrides: {VRSC: 'VRSCTEST'},
  };

  it('returns an account array matching the request network', () => {
    const accounts = [mainnetAccount, testnetAccount];

    expect(getMatchingRequestAccounts(accounts, false)).toEqual([
      mainnetAccount,
    ]);
    expect(getMatchingRequestAccounts(accounts, true)).toEqual([
      testnetAccount,
    ]);
  });

  it('returns an empty array for missing or malformed account state', () => {
    expect(getMatchingRequestAccounts(undefined, false)).toEqual([]);
    expect(getMatchingRequestAccounts({}, true)).toEqual([]);
  });
});
