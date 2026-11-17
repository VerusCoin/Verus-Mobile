import BigNumber from 'bignumber.js';

export const GIFT_CARD_DISPLAY_STATUS_READY = 'ready';
export const GIFT_CARD_DISPLAY_STATUS_PENDING = 'pending';
export const GIFT_CARD_DISPLAY_STATUS_SHARED = 'shared';
export const GIFT_CARD_DISPLAY_STATUS_NOT_FUNDED = 'not-funded';
export const GIFT_CARD_DISPLAY_STATUS_REDEEMED = 'redeemed';

export const GIFT_CARD_STATUS_TONE_SUCCESS = 'success';
export const GIFT_CARD_STATUS_TONE_WARNING = 'warning';
export const GIFT_CARD_STATUS_TONE_NEUTRAL = 'neutral';

const NO_CONTENTS_TEXT = 'No contents yet';
const CLAIMED_CONTENTS_TEXT = 'Empty';

const MATERIAL_PALETTES = [
  {
    id: 'indigo_twilight',
    top: '#5068E8',
    middle: '#3549B9',
    bottom: '#17245E',
    accent: '#9CC8FF',
  },
  {
    id: 'ocean_ink',
    top: '#287EA7',
    middle: '#1F567F',
    bottom: '#142A4C',
    accent: '#8FE1DB',
  },
  {
    id: 'violet_night',
    top: '#7659D8',
    middle: '#5140A8',
    bottom: '#27215E',
    accent: '#E2B8FF',
  },
  {
    id: 'teal_midnight',
    top: '#238A83',
    middle: '#21606E',
    bottom: '#172D4D',
    accent: '#A7E7C6',
  },
];

const getStableHash = value => {
  const stableValue = String(value || 'gift-card');
  let hash = 2166136261;

  for (let index = 0; index < stableValue.length; index += 1) {
    hash ^= stableValue.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const getConfirmedContents = card => {
  const contents = [];

  for (const system of card?.status?.systems || []) {
    for (const currency of system.currencies || []) {
      contents.push({
        type: 'currency',
        value: String(currency.amount),
        label: currency.display?.name || currency.currencyId,
      });
    }

    for (const identity of system.identities || []) {
      contents.push({
        type: 'identity',
        value: identity.fullyQualifiedName || identity.identityAddress,
        label: 'VerusID',
      });
    }
  }

  return contents;
};

const isPendingFunding = entry =>
  entry?.status === 'pending' || entry?.pending === true;

// Same rule as hasGiftCardBeenShared in giftCard.js, which this module does
// not import.
const isShared = card => {
  const sharedAt = Number(card?.sharedAt);

  return Number.isFinite(sharedAt) && sharedAt > 0;
};

const getCurrencyName = (card, systemId, currencyId, activeCoinsForUser) => {
  for (const system of card?.status?.systems || []) {
    const currency = (system.currencies || []).find(
      item => item.currencyId === currencyId,
    );

    if (currency?.display?.name) return currency.display.name;
    if (system.systemId === currencyId && system.coinObj) {
      return system.coinObj.display_ticker || system.coinObj.id;
    }
  }

  const coins = activeCoinsForUser || [];
  const coin =
    coins.find(
      item => item.system_id === systemId && item.currency_id === currencyId,
    ) || coins.find(item => item.currency_id === currencyId);

  return coin?.display_ticker || coin?.id || currencyId;
};

// Pending funding sent from this wallet records its outputs. Funding recorded
// without outputs has no amount, so it shows only its VerusIDs.
const getPendingContents = (card, activeCoinsForUser) => {
  const amounts = new Map();
  const identities = [];
  const seenIdentities = new Set();

  for (const entry of (card?.fundingHistory || []).filter(isPendingFunding)) {
    for (const transaction of entry.transactions || []) {
      for (const output of transaction?.outputs || []) {
        const amount = BigNumber(output?.amount);

        if (!output?.currencyId || !amount.isFinite() || amount.lte(0)) {
          continue;
        }

        const key = `${transaction.systemId}:${output.currencyId}`;
        const current = amounts.get(key);

        amounts.set(key, {
          systemId: transaction.systemId,
          currencyId: output.currencyId,
          amount: current ? current.amount.plus(amount) : amount,
        });
      }
    }

    for (const identity of entry.identities || []) {
      const name = identity?.fullyQualifiedName || identity?.identityAddress;

      if (!name || seenIdentities.has(name)) continue;

      seenIdentities.add(name);
      identities.push({type: 'identity', value: name, label: 'VerusID'});
    }
  }

  const currencies = [...amounts.values()].map(item => ({
    type: 'currency',
    value: item.amount.toFixed(),
    label: getCurrencyName(
      card,
      item.systemId,
      item.currencyId,
      activeCoinsForUser,
    ),
  }));

  return [...currencies, ...identities];
};

export const getGiftCardDisplayStatus = card => {
  if (card?.status?.state === 'redeemed' || card?.status?.redeemed) {
    return GIFT_CARD_DISPLAY_STATUS_REDEEMED;
  }

  if ((card?.fundingHistory || []).some(isPendingFunding)) {
    return GIFT_CARD_DISPLAY_STATUS_PENDING;
  }

  if (isShared(card)) return GIFT_CARD_DISPLAY_STATUS_SHARED;

  if (
    card?.status?.state === 'funded' ||
    card?.status?.hasClaims === true ||
    getConfirmedContents(card).length > 0
  ) {
    return GIFT_CARD_DISPLAY_STATUS_READY;
  }

  return GIFT_CARD_DISPLAY_STATUS_NOT_FUNDED;
};

const getStatusLabel = status => {
  if (status === GIFT_CARD_DISPLAY_STATUS_REDEEMED) return 'Claimed';
  if (status === GIFT_CARD_DISPLAY_STATUS_PENDING) return 'Pending';
  if (status === GIFT_CARD_DISPLAY_STATUS_SHARED) return 'Shared';
  if (status === GIFT_CARD_DISPLAY_STATUS_READY) return 'Ready';
  return 'Not funded';
};

export const getGiftCardStatusTone = status => {
  if (status === GIFT_CARD_DISPLAY_STATUS_READY) {
    return GIFT_CARD_STATUS_TONE_SUCCESS;
  }
  if (status === GIFT_CARD_DISPLAY_STATUS_PENDING) {
    return GIFT_CARD_STATUS_TONE_WARNING;
  }
  return GIFT_CARD_STATUS_TONE_NEUTRAL;
};

export const getGiftCardContentText = content =>
  content.type === 'currency'
    ? `${content.value} ${content.label}`
    : content.value;

export const getGiftCardPresentation = (card, {activeCoinsForUser} = {}) => {
  const status = getGiftCardDisplayStatus(card);
  const redeemed = status === GIFT_CARD_DISPLAY_STATUS_REDEEMED;
  let confirmedContents = getConfirmedContents(card);
  let pendingCount = (card?.fundingHistory || []).filter(
    isPendingFunding,
  ).length;
  const materialHash = getStableHash(card?.id || card?.label);
  let pendingContents = [];
  let primaryContent = confirmedContents[0] || null;
  let otherContents = confirmedContents.slice(1);
  let contentsPending = false;
  let pendingExtras = [];

  if (redeemed) {
    confirmedContents = [];
    pendingCount = 0;
    otherContents = [];
    primaryContent = {
      type: 'redeemed',
      value: CLAIMED_CONTENTS_TEXT,
      label: null,
    };
  } else if (pendingCount > 0) {
    pendingContents = getPendingContents(card, activeCoinsForUser);
  }

  if (!primaryContent && pendingContents.length > 0) {
    [primaryContent, ...otherContents] = pendingContents;
    contentsPending = true;
  } else if (primaryContent) {
    pendingExtras = pendingContents;
  }

  if (!primaryContent) {
    primaryContent = {
      type: 'empty',
      value: NO_CONTENTS_TEXT,
      label: null,
    };
  }

  return {
    label: card?.label || 'Gift card',
    status,
    statusLabel: getStatusLabel(status),
    statusTone: getGiftCardStatusTone(status),
    primaryContent,
    otherContents,
    contentsPending,
    // Pending items on a card that already has confirmed contents.
    pendingExtras,
    confirmedContents,
    confirmedItemCount: confirmedContents.length,
    additionalConfirmedCount: Math.max(confirmedContents.length - 1, 0),
    pendingContents,
    protectionLabel: card?.encrypted
      ? 'Claim password required'
      : 'Spendable link',
    hasPending: pendingCount > 0,
    pendingCount,
    material: {
      ...MATERIAL_PALETTES[materialHash % MATERIAL_PALETTES.length],
      seed: materialHash,
    },
  };
};
