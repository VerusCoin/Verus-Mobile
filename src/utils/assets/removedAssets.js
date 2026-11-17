import {CoinDirectory} from '../CoinData/CoinDirectory';
import {isTestnetAccount, removalKey} from './assetIdentity';
import {resolvedAssetCoin} from './assetPresentation';

// Keep public asset metadata only. Never persist wallet keys, cards or balances.
export const removedAssetRecord = (coin, lookupSystemId = coin.system_id) => ({
  coin: Object.fromEntries([
    'id', 'proto', 'currency_id', 'system_id', 'network', 'testnet',
    'display_name', 'display_ticker', 'mapped_to', 'icon_badge', 'pbaas_options',
  ].filter(key => coin[key] !== undefined).map(key => [key, coin[key]])),
  lookupSystemId,
});

export const getRemovedAssets = state => {
  const testnet = isTestnetAccount(state.authentication.activeAccount);
  const known = CoinDirectory.fullCoinList.map(id => CoinDirectory.getBasicCoinObj(id))
    .filter(coin => Boolean(coin.testnet) === testnet);
  const resolved = Object.values(state.assetManagement.resolved || {})
    .filter(result => Boolean(result.testnet) === testnet);
  const rootId = state.authentication.activeAccount?.testnetOverrides?.VRSC || 'VRSC';
  const root = known.find(coin => coin.id === rootId);
  return Object.entries(state.assetManagement.removed || {}).filter(([, value]) => value)
    .map(([key, value]) => {
      const result = resolved.find(item => removalKey(resolvedAssetCoin(item)) === key);
      const coin = known.find(item => removalKey(item) === key) || value.coin ||
        (result && resolvedAssetCoin(result)) || {
          id: key, currency_id: key, proto: 'vrsc', testnet,
          system_id: root?.system_id, display_name: key, display_ticker: key,
        };
      return {key, coin, lookupSystemId: value.lookupSystemId || result?.lookupSystemId ||
        coin.system_id || root?.system_id};
    });
};
