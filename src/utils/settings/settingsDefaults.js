import {ADDRESS_BLOCKLIST_FROM_WEBSERVER} from '../constants/constants';
import {USD} from '../constants/currencies';
import {normalizeLastOpenedAccountTimestamps} from '../account/accountActivity';
import {TESTNET_ENVIRONMENT_PUBLIC} from '../testnetEnvironment';
import {WALLET_NETWORKS} from '../account/accountNetwork';

export const DEFAULT_GENERAL_WALLET_SETTINGS = {
  minGasPriceGwei: 1,
  displayCurrency: USD,
  appearance: 'system',
  lastOpenedAccountTimestamps: {},
  identityColorSlotsByAccount: {},
  cardStackPreferencesByAccount: {},
  lastWalletNetwork: WALLET_NETWORKS.MAINNET,
  homeCardDragDetection: false,
  enableExperimentalGenericRequests: false,
  ackedCurrencyDisclaimer: false,
  addressBlocklistDefinition: {
    type: ADDRESS_BLOCKLIST_FROM_WEBSERVER,
    data: null,
  },
  addressBlocklist: [],
  vrpcOverrides: {},
  testnetEnvironment: TESTNET_ENVIRONMENT_PUBLIC,
  testnetPrices: false,
};

export const DEFAULT_SETTINGS = {
  btcFeesAdvanced: false,
  extendedCoinInfo: false,
  extendedTxInfo: false,
  pinForTxs: false,
  activeConfigSection: null,
  generalWalletSettings: DEFAULT_GENERAL_WALLET_SETTINGS,
  buySellSettings: {},
  coinSettings: {},
};

export const normalizeGeneralWalletSettings = generalWalletSettings => ({
  ...DEFAULT_GENERAL_WALLET_SETTINGS,
  ...(generalWalletSettings || {}),
  lastWalletNetwork:
    generalWalletSettings?.lastWalletNetwork === WALLET_NETWORKS.TESTNET
      ? WALLET_NETWORKS.TESTNET
      : WALLET_NETWORKS.MAINNET,
  lastOpenedAccountTimestamps: normalizeLastOpenedAccountTimestamps(
    generalWalletSettings
      ? generalWalletSettings.lastOpenedAccountTimestamps
      : null,
  ),
});

export const normalizeSettings = settings => ({
  ...DEFAULT_SETTINGS,
  ...(settings || {}),
  generalWalletSettings: normalizeGeneralWalletSettings(
    settings ? settings.generalWalletSettings : null,
  ),
});
