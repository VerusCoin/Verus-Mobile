import {DevSettings} from 'react-native';
import {coinsList} from '../../utils/CoinData/CoinsList';
import {clearActiveAccountLifecycles} from './account/dispatchers/account';
import {storeContractDefinitionsForNetwork} from '../../utils/asyncStore/contractDefinitionStorage';
import {storeCurrencyDefinitionsForSystemId} from '../../utils/asyncStore/currencyDefinitionStorage';
import {ETH_SEPOLIA} from '../../utils/constants/web3Constants';
import {clearCacheData} from './cache/Cache';
import {saveGeneralSettings} from './WalletSettings';

/**
 * Saves the testnet environment and reloads the app so it starts in that
 * environment. Both environments share the VRSCTEST system ID and the Sepolia
 * network, so stored testnet definitions and cached data are cleared first.
 * Testnet currencies missing from the directory are dropped from the active
 * coin list on the next start and need to be added again.
 * @param {String} environment A TESTNET_ENVIRONMENT_* value
 * @param {Function} dispatch Redux dispatch
 */
export const switchTestnetEnvironment = async (environment, dispatch) => {
  // Native synchronizers survive a JS reload. Use the bounded sign-out teardown
  // before changing settings; a failed close must prevent the reload.
  await clearActiveAccountLifecycles();

  await clearCacheData(dispatch);
  await storeCurrencyDefinitionsForSystemId(coinsList.VRSCTEST.currency_id, {});
  await storeContractDefinitionsForNetwork(ETH_SEPOLIA, {});

  dispatch(await saveGeneralSettings({testnetEnvironment: environment}));

  DevSettings.reload();
};
