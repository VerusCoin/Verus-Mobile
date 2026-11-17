import BigNumber from 'bignumber.js';

// Home restores the saved card, then respects a session choice. Otherwise prefer
// a funded card, then the existing active/default card when no balance is known.
export const getOpeningSubWallet = ({
  cards = [],
  balances,
  activeSubWallet,
  userSelectedSubWallet,
  savedSelectedId,
}) =>
  cards.find(card => card.id === savedSelectedId) ||
  cards.find(card => card.id === userSelectedSubWallet?.id) ||
  cards.find(card => BigNumber(balances?.[card.id]?.total || 0).isGreaterThan(0)) ||
  cards.find(card => card.id === activeSubWallet?.id) ||
  cards[0];
