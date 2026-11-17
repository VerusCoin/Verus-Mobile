import BigNumber from 'bignumber.js';
import {CoinDirectory} from '../CoinData/CoinDirectory';
import {coinsList} from '../CoinData/CoinsList';
import {API_GET_ADDRESSES} from '../constants/intervalConstants';

export const getLedgerConfirmed = ledgerEntry => {
  if (ledgerEntry == null) return null;

  return BigNumber.isBigNumber(ledgerEntry)
    ? ledgerEntry
    : ledgerEntry.confirmed;
};

// A card shows its total, the same number Home adds up. Funds that still
// confirm are part of it.
export const getLedgerTotal = ledgerEntry => {
  if (ledgerEntry == null) return null;
  if (BigNumber.isBigNumber(ledgerEntry)) return ledgerEntry;

  return ledgerEntry.total ?? ledgerEntry.confirmed;
};

export const isVerusIdWallet = wallet =>
  Boolean(wallet?.name?.endsWith('@'));

const isVrpcWallet = wallet => Boolean(wallet?.channel?.startsWith('vrpc.'));

export const getSubWalletCardType = wallet => {
  if (isVerusIdWallet(wallet)) return 'VerusID';
  if (wallet?.id === 'PRIVATE_WALLET') return 'Private';
  if (isVrpcWallet(wallet)) return 'Transparent';

  return 'Address';
};

const getCoinForSystem = systemId => {
  if (!systemId) return null;
  if (coinsList[systemId]) return coinsList[systemId];

  try {
    return CoinDirectory.findCoinObj(systemId);
  } catch (error) {
    return null;
  }
};

export const getNetworkTicker = systemId => {
  if (!systemId) return '';
  if (systemId === '.eth') return 'ETH';

  const coin = getCoinForSystem(systemId);
  if (coin?.display_ticker) return coin.display_ticker;

  if (
    typeof systemId === 'string' &&
    systemId.startsWith('i') &&
    systemId.length > 30
  ) {
    return '';
  }

  return systemId;
};

export const getSubWalletNetworkLabel = (wallet, coin) => {
  const networkCoin = getCoinForSystem(wallet?.network);

  return (
    networkCoin?.display_name ||
    networkCoin?.display_ticker ||
    coin?.display_name ||
    coin?.display_ticker ||
    wallet?.network ||
    ''
  );
};

export const getSubWalletDisplayIdentifier = (
  wallet,
  activeAccount,
  chainTicker,
  fallbackToName = true,
) => {
  if (!wallet) return '-';
  if (isVerusIdWallet(wallet)) return wallet.name;

  const addressChannel = wallet.api_channels?.[API_GET_ADDRESSES];
  const addresses =
    addressChannel == null
      ? null
      : activeAccount?.keys?.[chainTicker]?.[addressChannel]?.addresses;

  return addresses?.[0] || (fallbackToName ? wallet.name : null) || '-';
};

export const truncateMiddle = (
  value,
  start = 8,
  end = 8,
  separator = '...',
) => {
  if (typeof value !== 'string') return '';
  if (value.length <= start + end + separator.length) return value;

  return `${value.slice(0, start)}${separator}${value.slice(-end)}`;
};

export const sortSubWalletsByBalance = (subWallets = [], balances = {}) => {
  return subWallets
    .map((wallet, originalIndex) => {
      const confirmed = getLedgerConfirmed(balances?.[wallet.id]);

      return {
        wallet,
        originalIndex,
        confirmedSortValue:
          confirmed == null ? BigNumber(0) : BigNumber(confirmed),
      };
    })
    .sort((first, second) => {
      const balanceOrder = second.confirmedSortValue.comparedTo(
        first.confirmedSortValue,
      );

      return balanceOrder === 0
        ? first.originalIndex - second.originalIndex
        : balanceOrder;
    })
    .map(item => item.wallet);
};
