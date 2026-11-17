export const WALLET_AVATAR_ICONS = [
  {emoji: '⛽', label: 'Gas'},
  {emoji: '💳', label: 'Card'},
  {emoji: '🛡️', label: 'Vault'},
  {emoji: '💎', label: 'Reserve'},
  {emoji: '🌱', label: 'Growth'},
  {emoji: '🧭', label: 'Explore'},
  {emoji: '⚡', label: 'Active'},
  {emoji: '🏠', label: 'Home'},
];

export const WALLET_AVATAR_COLORS = [
  {backgroundColor: '#3165D4', label: 'Verus'},
  {backgroundColor: '#4AA658', label: 'Green'},
  {backgroundColor: '#F89336', label: 'Amber'},
  {backgroundColor: '#0E9F9A', label: 'Teal'},
  {backgroundColor: '#7C3AED', label: 'Violet'},
  {backgroundColor: '#232323', label: 'Graphite'},
];

export const DEFAULT_WALLET_AVATAR = {
  emoji: '💳',
  backgroundColor: '#3165D4',
};

const WALLET_AVATAR_ICON_SET = new Set(
  WALLET_AVATAR_ICONS.map(({emoji}) => emoji),
);
const WALLET_AVATAR_COLOR_SET = new Set(
  WALLET_AVATAR_COLORS.map(({backgroundColor}) => backgroundColor),
);

export const normalizeWalletAvatar = (walletAvatar, fallback = null) => {
  if (walletAvatar == null || typeof walletAvatar !== 'object') {
    return fallback;
  }

  const {emoji, backgroundColor} = walletAvatar;

  if (
    !WALLET_AVATAR_ICON_SET.has(emoji) ||
    !WALLET_AVATAR_COLOR_SET.has(backgroundColor)
  ) {
    return fallback;
  }

  return {
    emoji,
    backgroundColor,
  };
};

export const getDefaultWalletAvatar = () => ({...DEFAULT_WALLET_AVATAR});
