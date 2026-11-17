import BigNumber from 'bignumber.js';
import {WALLET_APP_SEND} from '../../utils/constants/apps';
import {
  API_GET_BALANCES,
  API_SEND,
} from '../../utils/constants/intervalConstants';
import {extractLedgerData} from '../../utils/ledger/extractLedgerData';
import {extractDisplaySubWallets} from '../../utils/subwallet/extractSubWallets';
import {
  getPrivateSyncPercent,
  getSpendableBalance,
  isPrivateChannel,
  selectPrivateWalletInfo,
} from '../../utils/subwallet/privateWallet';
import {cardCanPay} from './privateSend';

// The cards of an asset that can send and hold a balance. A scanned request
// with an amount opens Confirm only when exactly one card can pay; with more,
// Send asks for the card first, as SendWizardNavigator does. Only the private
// card pays a private address, and not while it still syncs.
export const countFundedSendCards = (state, coinId, address) => {
  const cards = extractDisplaySubWallets(state)[coinId] || [];
  const balances = extractLedgerData(state, 'balances', API_GET_BALANCES);
  const privateSyncing =
    getPrivateSyncPercent(selectPrivateWalletInfo(state)[coinId]) != null;

  return cards.filter(card => {
    const channel = card.api_channels?.[API_SEND];
    return (
      card.compatible_apps?.includes(WALLET_APP_SEND) &&
      Boolean(channel) &&
      cardCanPay(channel, address) &&
      !(isPrivateChannel(channel) && privateSyncing) &&
      BigNumber(getSpendableBalance(balances?.[coinId]?.[card.id], card)).isGreaterThan(0)
    );
  }).length;
};
