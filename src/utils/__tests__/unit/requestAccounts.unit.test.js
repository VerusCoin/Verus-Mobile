import {
  assertRequestNetworkMatchesAccount,
  getMatchingRequestAccounts,
} from '../../deeplink/requestAccounts';

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

  it('allows requests that match the active profile network', () => {
    expect(() =>
      assertRequestNetworkMatchesAccount(mainnetAccount, false),
    ).not.toThrow();
    expect(() =>
      assertRequestNetworkMatchesAccount(testnetAccount, true),
    ).not.toThrow();
  });

  it('rejects requests that do not match the active profile network', () => {
    expect(() =>
      assertRequestNetworkMatchesAccount(mainnetAccount, true),
    ).toThrow(/created for testnet.*active profile uses mainnet/i);
    expect(() =>
      assertRequestNetworkMatchesAccount(testnetAccount, false),
    ).toThrow(/created for mainnet.*active profile uses testnet/i);
  });

  it('does not enforce a network without an active account', () => {
    expect(() =>
      assertRequestNetworkMatchesAccount(null, true),
    ).not.toThrow();
  });
});
