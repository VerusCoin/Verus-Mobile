import {sortSubWalletsByBalance} from './cardPresentation';
import {
  getCardStackMainId,
  getCardStackPinLimit,
  getCardStackPins,
} from './cardStackPreferences';

// Input is already in priority order. Every visible shape counts toward the cap.
export const buildAssetStack = (cards, selectedId, compact) => {
  const cap = compact ? 4 : 6;
  const front = cards.find(card => card.wallet.id === selectedId);
  if (!front) return [];
  const others = cards.filter(card => card !== front);
  const visible = others.slice(0, others.length < cap ? cap - 1 : cap - 2);
  const hidden = others.slice(visible.length);
  return [
    ...(hidden.length ? [{key: 'more', hidden}] : []),
    ...visible.reverse().map(card => ({key: card.wallet.id, card})),
    {key: front.wallet.id, card: front},
  ];
};

// Cards enter in their original order. Return shapes back to front, as rendered.
export const buildOrderedAssetStack = ({
  cards = [],
  balances,
  selectedId,
  pins,
  lastUsedId,
  compact,
}) => {
  const byId = new Map(cards.map(card => [card.wallet.id, card]));
  const front = byId.get(selectedId);
  if (!front) return [];
  const wallets = [...byId.values()].map(card => card.wallet);
  const mainId = getCardStackMainId(wallets);
  const livePins = getCardStackPins(wallets, pins);
  const stackPins = livePins.slice(0, getCardStackPinLimit(compact));
  // The front consumes the last-used slot unless it is Main or a visible pin.
  // This also keeps an old, larger pin list within the compact shape cap.
  const last =
    selectedId !== mainId && !stackPins.includes(selectedId)
      ? selectedId
      : lastUsedId === mainId || livePins.includes(lastUsedId)
      ? null
      : lastUsedId;
  const priority = [
    mainId,
    ...stackPins,
    last,
    ...sortSubWalletsByBalance(wallets, balances).map(wallet => wallet.id),
  ];
  const ordered = [...new Set(priority)].map(id => byId.get(id)).filter(Boolean);
  return buildAssetStack(ordered, selectedId, compact);
};
