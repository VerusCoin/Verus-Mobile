import {useMemo} from 'react';
import {useSelector} from 'react-redux';
import BigNumber from 'bignumber.js';
import {formatCurrency} from 'react-native-format-currency';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {CONNECTION_ERROR} from '../../utils/api/errors/errorMessages';
import {USD} from '../../utils/constants/currencies';
import {
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  DLIGHT_PRIVATE,
} from '../../utils/constants/intervalConstants';
import {
  extractErrorData,
  extractLedgerData,
} from '../../utils/ledger/extractLedgerData';
import {truncateDecimal} from '../../utils/math';
import {getCardColors} from '../../utils/subwallet/cardColors';
import {
  getLedgerTotal,
  getNetworkTicker,
  getSubWalletCardType,
  getSubWalletDisplayIdentifier,
} from '../../utils/subwallet/cardPresentation';
import {
  formatSyncStatus,
  getPrivateSyncPercent,
  isPrivateCard,
} from '../../utils/subwallet/privateWallet';

export const sumCardBalances = cards => {
  let total = BigNumber(0);
  for (const card of cards) {
    if (card.balance != null) total = total.plus(card.balance);
    else if (card.type !== 'Private') return null;
  }
  return total;
};

export default function useAssetCardData() {
  const coin = useObjectSelector(state => state.coins.activeCoin);
  const wallets = useObjectSelector(
    state => state.coinMenus.allSubWallets[coin.id] || [],
  );
  const selected = useObjectSelector(
    state => state.coinMenus.activeSubWallets[coin.id],
  );
  const balances = useObjectSelector(state =>
    extractLedgerData(state, 'balances', API_GET_BALANCES, coin.id),
  );
  const errors = useObjectSelector(state =>
    extractErrorData(state, API_GET_BALANCES, coin.id),
  );
  const rates = useObjectSelector(state => state.ledger.rates);
  const account = useSelector(state => state.authentication.activeAccount);
  const stackPreferences = useObjectSelector(state =>
    state.settings.generalWalletSettings.cardStackPreferencesByAccount?.[account?.accountHash]?.[coin.id] || {},
  );
  const showBalance = useSelector(state => state.coins.showBalance);
  const currency = useSelector(
    state => state.settings.generalWalletSettings.displayCurrency || USD,
  );
  const slots = useSelector(
    state =>
      state.settings.generalWalletSettings.identityColorSlotsByAccount?.[
        account?.accountHash
      ],
  );
  const privateSync = useSelector(state =>
    getPrivateSyncPercent(state.ledger.info?.[DLIGHT_PRIVATE]?.[coin.id]),
  );

  return useMemo(() => {
    const fiat = (wallet, balance) => {
      const rate =
        rates?.[wallet.api_channels?.[API_GET_FIATPRICE]]?.[coin.id]?.[
          currency
        ];
      if (balance == null || rate == null) return null;
      const value = BigNumber(balance).multipliedBy(rate);
      return value.isFinite()
        ? formatCurrency({amount: value.toFixed(2), code: currency})[0]
        : null;
    };
    const cards = wallets.map(wallet => {
      const type = getSubWalletCardType(wallet);
      const balance = getLedgerTotal(balances?.[wallet.id]);
      const hasError = Boolean(errors?.[wallet.id]);
      const syncStatus =
        isPrivateCard(wallet) && privateSync != null
          ? formatSyncStatus(privateSync)
          : null;
      const identifier = getSubWalletDisplayIdentifier(
        wallet,
        account,
        coin.id,
      );
      const amountText = hasError
        ? CONNECTION_ERROR
        : balance == null
        ? '—'
        : truncateDecimal(balance, 8);
      const fiatText = hasError || syncStatus ? null : fiat(wallet, balance);
      const balanceLabel = hasError
        ? 'Connection error'
        : balance == null
        ? 'Balance unavailable'
        : !showBalance
        ? 'Balance hidden'
        : [amountText, coin.display_ticker, fiatText, syncStatus]
            .filter(Boolean)
            .join(', ');
      return {
        wallet,
        type,
        balance,
        hasError,
        syncStatus,
        identifier,
        amountText,
        fiatText,
        balanceLabel,
        title: type === 'VerusID' ? wallet.name : type,
        colors: getCardColors(wallet, slots),
        network:
          wallet.network && wallet.network !== coin.system_id
            ? getNetworkTicker(wallet.network)
            : null,
      };
    });
    const total = sumCardBalances(cards);
    const totalFiat =
      cards
        .map(card => fiat(card.wallet, total))
        .find(value => value != null) ?? null;
    const summary = hiddenCards => {
      const balance = sumCardBalances(hiddenCards);
      const hasError = hiddenCards.some(card => card.hasError);
      const amountText = hasError
        ? CONNECTION_ERROR
        : balance == null
        ? '—'
        : truncateDecimal(balance, 8);
      const fiatText = hasError
        ? null
        : hiddenCards
            .map(card => fiat(card.wallet, balance))
            .find(value => value != null) ?? null;
      return {
        amountText,
        fiatText,
        balance,
        hasError,
        balanceLabel: hasError
          ? 'Connection error'
          : balance == null
          ? 'Balance unavailable'
          : !showBalance
          ? 'Balance hidden'
          : [amountText, fiatText].filter(Boolean).join(', '),
      };
    };
    return {
      coin,
      cards,
      selected,
      balances,
      stackPreferences,
      showBalance,
      total,
      totalFiat,
      summary,
    };
  }, [
    account,
    balances,
    coin,
    currency,
    errors,
    privateSync,
    rates,
    selected,
    showBalance,
    slots,
    stackPreferences,
    wallets,
  ]);
}
