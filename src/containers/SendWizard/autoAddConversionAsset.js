import store from '../../store';
import {resolveAssetIdentifier} from '../../utils/CoinData/assetIdentifierService';
import {
  addManagedAsset,
  assetContextIsCurrent,
  loadAssetManagement,
} from '../../utils/assets/assetManagementService';
import {
  isAssetShown,
  isTestnetAccount,
  matchesVrpcHolding,
} from '../../utils/assets/assetIdentity';
import {resolvedAssetCoin} from '../../utils/assets/assetPresentation';
import {VRPC} from '../../utils/constants/intervalConstants';
import {ADDRESS_TYPE, isOwnChannelAddress} from './wizardUtils';

// Called only after broadcast success. Never let metadata/storage failures
// change that result, and never log provider errors containing wallet data.
export const autoAddConversionAsset = async ({
  activeAccount,
  channel,
  context,
  recipientAddress,
  route,
  sourceCoin,
  target,
}) => {
  try {
    const [channelType, , systemId] = String(channel || '').split('.');
    if (!assetContextIsCurrent(context) ||
        channelType !== VRPC || !systemId || sourceCoin?.proto !== 'vrsc' ||
        !target?.isConversion || !target.transactionCurrency || !route ||
        route.isCrossChain || route.exportTo || route.exportToFqn || route.mapTo ||
        route.addressType !== ADDRESS_TYPE.VERUS || route.networkKey !== systemId ||
        Boolean(sourceCoin.testnet) !== isTestnetAccount(activeAccount) ||
        !isOwnChannelAddress({activeAccount, channel, recipientAddress, sourceCoin})) {
      return;
    }

    const holding = {
      currencyId: target.transactionCurrency,
      testnet: Boolean(sourceCoin.testnet),
    };
    const activeCoins = store.getState().coins.activeCoinsForUser || [];
    if (activeCoins.some(coin => matchesVrpcHolding(coin, holding))) return;

    // Resolve through the source Card's system, including its public/private
    // Testnet endpoint override. Never infer a currency from its ticker.
    const result = await resolveAssetIdentifier({
      activeCoins: [],
      identifier: target.transactionCurrency,
      kind: 'pbaas',
      pbaasCoin: {system_id: systemId, testnet: holding.testnet},
    });
    if (!assetContextIsCurrent(context) ||
        result.currencyDefinition.systemid !== systemId ||
        Boolean(result.testnet) !== holding.testnet) return;

    await loadAssetManagement(context);
    if (!assetContextIsCurrent(context) ||
        !isAssetShown(resolvedAssetCoin(result), store.getState().assetManagement.preferences)) return;

    // Same serialized, session-scoped activation and storage path as Review >
    // Add asset. Automatic mode never resets a saved Hidden preference.
    await addManagedAsset({result, automatic: true, context});
  } catch (_) {
    console.warn('Could not automatically add the conversion asset.');
  }
};
