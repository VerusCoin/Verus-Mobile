import {reconcileSpendableKeyClaimResults} from '../../spendableKey/claimResultReconciliation';

describe('spendable-key claim result reconciliation', () => {
  it('runs identity and currency reconciliation for partial results', async () => {
    const results = [{type: 'identity'}, {type: 'currency'}];
    const linkClaimedIdentities = jest.fn().mockResolvedValue();
    const addMissingRedeemedCurrencies = jest.fn().mockResolvedValue();

    await expect(
      reconcileSpendableKeyClaimResults({
        results,
        linkClaimedIdentities,
        addMissingRedeemedCurrencies,
      }),
    ).resolves.toEqual({
      identityLinkError: null,
      currencyAddError: null,
    });
    expect(linkClaimedIdentities).toHaveBeenCalledWith(results);
    expect(addMissingRedeemedCurrencies).toHaveBeenCalledWith(results);
  });

  it('attempts currency reconciliation even when identity linking fails', async () => {
    const identityError = new Error('link failed');
    const addMissingRedeemedCurrencies = jest.fn().mockResolvedValue();

    await expect(
      reconcileSpendableKeyClaimResults({
        results: [{type: 'identity'}],
        linkClaimedIdentities: jest.fn().mockRejectedValue(identityError),
        addMissingRedeemedCurrencies,
      }),
    ).resolves.toEqual({
      identityLinkError: identityError,
      currencyAddError: null,
    });
    expect(addMissingRedeemedCurrencies).toHaveBeenCalled();
  });
});
