import BigNumber from 'bignumber.js';

export const getSpendableKeyReviewModel = claimPlan => {
  const systems = (claimPlan?.systems || [])
    .map(system => ({
      ...system,
      // The plan's amount is net and remains the claim/button amount.
      // Only its native currency pays the fee shown for this system.
      currencies: (system.currencies || []).map(currency => ({
        ...currency,
        balanceAmount: currency.currencyId === system.systemId
          ? BigNumber(currency.amount).plus(system.feeAmount || 0).toFixed()
          : currency.amount,
      })),
      identities: system.identities || [],
    }))
    .filter(
      system => system.currencies.length > 0 || system.identities.length > 0,
    );
  const balances = systems.flatMap(system =>
    system.currencies.map(currency => ({currency, system})),
  );
  const identities = systems.flatMap(system =>
    system.identities.map(identity => ({identity, system})),
  );
  const balanceCount = balances.length;
  const identityCount = identities.length;

  return {
    systems,
    balances,
    identities,
    balanceCount,
    identityCount,
    itemCount: balanceCount + identityCount,
    singleBalance: balanceCount === 1 ? balances[0] : null,
    hasMultipleSystems: systems.length > 1,
  };
};

export const getSpendableKeyReviewSubtitle = model => {
  const {balanceCount, identityCount} = model;

  if (balanceCount === 1 && identityCount === 0) {
    return 'Review the balance found on this key.';
  }
  if (balanceCount === 1 && identityCount === 1) {
    return 'Review the balance and VerusID found on this key.';
  }
  if (balanceCount === 1 && identityCount > 1) {
    return 'Review the balance and VerusIDs found on this key.';
  }
  if (balanceCount > 1 && identityCount === 0) {
    return 'Review the balances found on this key.';
  }
  if (balanceCount > 0 && identityCount > 0) {
    return 'Review the balances and VerusIDs found on this key.';
  }
  if (identityCount === 1) {
    return 'Review the VerusID found on this key.';
  }
  if (identityCount > 1) {
    return 'Review the VerusIDs found on this key.';
  }

  return 'No transparent funds or VerusIDs were found.';
};

export const getSpendableKeyClaimLabel = model => {
  if (model.singleBalance && model.identityCount === 0) {
    const {currency} = model.singleBalance;
    const ticker = currency.display?.name || currency.currencyId;
    const amountLabel = `${currency.amount} ${ticker}`;

    return amountLabel.length <= 24 ? `Claim ${amountLabel}` : 'Claim balance';
  }
  if (model.balanceCount === 1 && model.identityCount === 1) {
    return 'Claim balance and VerusID';
  }
  if (model.balanceCount > 1 && model.identityCount === 0) {
    return `Claim ${model.balanceCount} balances`;
  }
  if (model.balanceCount > 0 && model.identityCount > 0) {
    return `Claim ${model.itemCount} items`;
  }
  if (model.identityCount === 1) return 'Claim VerusID';
  if (model.identityCount > 1) return `Claim ${model.identityCount} VerusIDs`;

  return 'Claim';
};

export const getSpendableKeyWalletGate = ({
  activeAccountMatchesRequest,
  matchingAccountCount,
  signedIn,
}) => {
  if (activeAccountMatchesRequest) return null;
  if (matchingAccountCount === 0) {
    return {
      actionLabel: 'Set up wallet',
      helper:
        'Set up a wallet first. You will return to this saved claim when setup is complete.',
      type: 'setup',
    };
  }
  if (signedIn) {
    return {
      actionLabel: 'Switch wallet',
      helper: 'Switch wallet first, then claim these items.',
      type: 'switch',
    };
  }

  return {
    actionLabel: 'Unlock wallet',
    helper: 'Unlock wallet first, then claim these items.',
    type: 'unlock',
  };
};
