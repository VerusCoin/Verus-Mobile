// Use only addresses from this wallet's VRPC keys, including the verified
// signing address on the prepared review. Linked VerusIDs do not prove control.
export const signingPolicySummary = (review, walletAddresses) => {
  const addresses = review.after.primaryaddresses;
  const owned = new Set([review.signingAddress, ...walletAddresses]);
  const others = addresses.filter(address => !owned.has(address)).length;
  const count = addresses.length;
  const required = Number(review.after.minimumsignatures);
  const who = others === count ? 'Other addresses' : others === 0 ? 'Only you'
    : `You and ${others} ${others === 1 ? 'other' : 'others'}`;
  return {
    summary: `${who} · ${required} of ${count} ${count === 1 ? 'signature' : 'signatures'}`,
    meaning: required > 1 ? `${required} of these ${count} addresses must sign together.`
      : count === 2 ? 'Either address can spend and sign.'
      : count > 2 ? 'Any of these addresses can spend and sign.'
      : 'This address can spend and sign.',
  };
};

export const changedFieldValues = (before, after) => {
  const previous = Array.isArray(before) ? before : before ? [before] : [];
  const next = Array.isArray(after) ? after : after ? [after] : [];
  return [
    ...next.map(value => ({value, status: previous.includes(value) ? undefined : 'Added'})),
    ...previous.filter(value => !next.includes(value)).map(value => ({value, status: 'Removed'})),
  ];
};
