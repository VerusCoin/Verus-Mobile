import {getSubWalletCardType} from './cardPresentation';

export const PRIVATE_CARD_ID = 'PRIVATE_WALLET';

// Resolve before balance sorting: Verus/PBaaS use a dynamic Transparent card.
export const getCardStackMainId = (cards = []) =>
  cards.find(card => card.id === 'MAIN_WALLET')?.id ||
  cards.find(card => getSubWalletCardType(card) === 'Transparent')?.id ||
  null;

export const getCardStackPinLimit = compact => (compact ? 1 : 3);

// Undefined means the user has never changed pins. An explicit [] stays empty.
// Keep all live pins here, including pins above the current layout's limit.
export const getCardStackPins = (cards = [], pins) => {
  const ids = new Set(cards.map(card => card.id));
  const mainId = getCardStackMainId(cards);
  return [...new Set(Array.isArray(pins) ? pins : [PRIVATE_CARD_ID])].filter(
    id => id !== mainId && ids.has(id),
  );
};

export const selectCardStackCard = (preferences = {}, cards, selectedId) => {
  const mainId = getCardStackMainId(cards);
  const pins = getCardStackPins(cards, preferences.pins);
  return {
    ...preferences,
    selectedId,
    lastUsedId:
      selectedId !== mainId && !pins.includes(selectedId)
        ? selectedId
        : preferences.lastUsedId === mainId
        ? null
        : preferences.lastUsedId || null,
  };
};

export const toggleCardStackPin = ({
  preferences = {},
  cards = [],
  selectedId,
  cardId,
  compact,
}) => {
  const mainId = getCardStackMainId(cards);
  if (cardId === mainId || !cards.some(card => card.id === cardId)) {
    return {preferences, result: 'unavailable'};
  }
  const pins = getCardStackPins(cards, preferences.pins);
  const pinned = pins.includes(cardId);
  if (!pinned && pins.length >= getCardStackPinLimit(compact)) {
    return {preferences, result: 'limit'};
  }
  // A successful edit prunes stale ids and saves an explicit ordered list.
  const next = {
    ...preferences,
    pins: pinned ? pins.filter(id => id !== cardId) : [...pins, cardId],
    lastUsedId:
      preferences.lastUsedId === mainId ||
      (!pinned && preferences.lastUsedId === cardId)
        ? null
        : preferences.lastUsedId || null,
  };
  if (
    selectedId &&
    selectedId !== mainId &&
    !next.pins.includes(selectedId)
  ) {
    next.lastUsedId = selectedId;
  }
  return {preferences: next, result: pinned ? 'unpinned' : 'pinned'};
};
