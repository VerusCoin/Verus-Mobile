import BigNumber from 'bignumber.js';
import {API_GET_BALANCES, VRPC} from '../constants/intervalConstants';

export const isTestnetAccount = account =>
  Object.keys(account?.testnetOverrides || {}).length > 0;

export const assetNetworkKey = account =>
  isTestnetAccount(account)
    ? `testnet:${account.testnetOverrides.VRSC || ''}:${account.testnetOverrides.ETH || ''}`
    : 'mainnet';

export const ethereumNetwork = coin => coin.network ||
  (coin.testnet ? 'sepolia' : 'homestead');

// Currency identity belongs to a network, never to a display name or ticker.
// A Verus currency can have holdings on several systems, represented by cards.
export const assetKey = coin => {
  const network = coin.testnet ? 'testnet' : 'mainnet';
  const id = coin.currency_id || coin.id;
  if (coin.proto === 'erc20' || coin.proto === 'eth') {
    return `${coin.proto}:${ethereumNetwork(coin)}:${String(id).toLowerCase()}`;
  }
  return `${network}:${coin.proto}:${coin.system_id || coin.network || coin.id}:${id}`;
};

export const vrpcHoldingKey = (testnet, systemId, currencyId) =>
  `${testnet ? 'testnet' : 'mainnet'}:${VRPC}:${systemId}:${currencyId}`;

export const finiteBalance = value => {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const balance = BigNumber(value);
  return balance.isFinite() && !balance.isNegative() ? balance : null;
};

export const sameAsset = (left, right) => assetKey(left) === assetKey(right);

export const uniqueAssets = coins => {
  const seen = new Set();
  return (coins || []).filter(coin => {
    const key = assetKey(coin);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const isAssetShown = (coin, preferences) =>
  preferences?.[assetKey(coin)]?.hidden !== true;

// The wallet's main coin carries the other Verus assets and VerusIDs, so it
// always stays in the wallet.
export const isMainAsset = (coin, account) =>
  coin.id === (isTestnetAccount(account) ? account.testnetOverrides.VRSC : 'VRSC');

// Verus removals apply on every system. Other protocols keep their full identity.
export const removalKey = coin =>
  coin?.proto === 'vrsc' && coin.currency_id ? coin.currency_id : assetKey(coin);

export const matchesVrpcHolding = (coin, holding) =>
  coin.proto === 'vrsc' &&
  Boolean(coin.testnet) === Boolean(holding.testnet) &&
  coin.currency_id === holding.currencyId;

// Each snapshot is one complete response for one known address on one system.
// Several active currencies request that same map: replace it, never sum it.
export const getPositiveVrpcHoldings = snapshots => {
  const holdings = {};
  for (const [channel, snapshot] of Object.entries(snapshots || {})) {
    for (const [currencyId, value] of Object.entries(snapshot.currencies || {})) {
      const balance = finiteBalance(value);
      if (!balance?.isGreaterThan(0)) continue;
      const key = vrpcHoldingKey(snapshot.testnet, snapshot.systemId, currencyId);
      const holding = holdings[key] || {
        key,
        currencyId,
        systemId: snapshot.systemId,
        testnet: snapshot.testnet,
        balance: BigNumber(0),
        channels: [],
      };
      holding.balance = holding.balance.plus(balance);
      holding.channels.push(channel);
      holdings[key] = holding;
    }
  }
  return Object.values(holdings);
};

export const getManagedAssetBalance = (coin, cards, ledger, snapshots = {}) => {
  const channels = [...new Set((cards || [])
    .map(card => card.api_channels?.[API_GET_BALANCES])
    .filter(Boolean))];
  let total = BigNumber(0);
  let available = 0;
  for (const channel of channels) {
    const snapshot = snapshots[channel];
    const value = channel.startsWith(`${VRPC}.`) && snapshot &&
      Boolean(snapshot.testnet) === Boolean(coin.testnet)
      ? snapshot.currencies[coin.currency_id] ?? '0'
      : ledger?.[channel]?.[coin.id]?.total;
    const balance = finiteBalance(value);
    if (balance != null) {
      total = total.plus(balance);
      available += 1;
    }
  }
  return {
    total: available > 0 ? total : null,
    complete: channels.length > 0 && available === channels.length,
  };
};
