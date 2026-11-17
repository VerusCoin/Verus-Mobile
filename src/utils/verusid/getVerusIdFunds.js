import BigNumber from 'bignumber.js';
import {VRPC} from '../constants/intervalConstants';

// A linked VerusID is a card on every active Verus/PBaaS asset, with the
// channel `vrpc.<i-address>.<system>` (sagas/coins.js).
export const getVerusIdCardAddress = card => {
  const channel = card?.channel;

  if (typeof channel !== 'string' || !channel.startsWith(`${VRPC}.`)) {
    return null;
  }

  return channel.split('.')[1] || null;
};

export const findVerusIdCard = (cards = [], iAddress) =>
  cards.find(card => getVerusIdCardAddress(card) === iAddress) || null;

// The funds of one VerusID: every asset whose VerusID card has a balance.
// `cardsByCoin` comes from extractDisplaySubWallets and `balances` from
// extractLedgerData(state, 'balances', API_GET_BALANCES). `loaded` is false
// while the VerusID has cards but the ledger holds no balance for any of them.
// A VerusID without cards has nothing to wait for.
export const getVerusIdFunds = ({balances, cardsByCoin, coins = [], iAddress}) => {
  const funds = [];
  let hasCards = false;
  let loaded = false;

  coins.forEach(coin => {
    const card = findVerusIdCard(cardsByCoin?.[coin.id], iAddress);
    const entry = card ? balances?.[coin.id]?.[card.id] : null;

    if (card) hasCards = true;
    if (entry == null) return;

    loaded = true;
    const balance = BigNumber(entry.total ?? entry.confirmed ?? 0);

    if (balance.isFinite() && balance.isGreaterThan(0)) {
      funds.push({balance, card, coin});
    }
  });

  return {funds, loaded: loaded || !hasCards};
};

export const formatAssetCount = count => {
  if (count === 0) return 'No assets';
  if (count === 1) return '1 asset';

  return `${count} assets`;
};
