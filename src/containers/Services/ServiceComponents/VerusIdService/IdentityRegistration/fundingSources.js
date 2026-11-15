import BigNumber from 'bignumber.js';

// Linked IDs are payment candidates, not proof of spending authority. The
// registration builder verifies their current on-chain authority before payment.
export const registrationFundingSources = (coin, account, linkedIds = {}) => {
  const signingAddress = account?.keys?.[coin?.id]?.vrpc?.addresses?.[0];
  if (!coin || !signingAddress) return [];

  const identities = {
    ...(linkedIds[coin.testnet ? 'VRSCTEST' : 'VRSC'] || {}),
    ...(linkedIds[coin.id] || {}),
  };
  return [
    {address: signingAddress, signingAddress, fundingName: 'Wallet address', isIdentity: false},
    ...Object.entries(identities)
      .filter(([address, name]) => address !== signingAddress && typeof name === 'string')
      .map(([address, fundingName]) => ({address, signingAddress, fundingName, isIdentity: true}))
      .sort((left, right) => left.fundingName.localeCompare(right.fundingName)),
  ];
};

export const registrationFundingBalance = (coin, source, balances = {}) =>
  balances[`vrpc.${source.address}.${coin?.system_id}`]?.[coin?.id]?.confirmed;

// Compare decimal balances without rounding. Missing balances cannot outrank
// a funded source; equal balances retain the stable source order.
export const preferredRegistrationFundingSource = (sources, coin, balances = {}) => {
  let preferred = sources[0];
  let greatest = new BigNumber(0);
  sources.forEach(source => {
    const balance = new BigNumber(registrationFundingBalance(coin, source, balances));
    if (balance.isFinite() && balance.gt(greatest)) {
      preferred = source;
      greatest = balance;
    }
  });
  return preferred;
};
