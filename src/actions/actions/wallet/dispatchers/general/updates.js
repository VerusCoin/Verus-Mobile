/* eslint-disable import/no-cycle -- The shared VRPC provider is initialized through Redux dispatchers. */
/* global __DEV__ */
import { getCoinRates } from '../../../../../utils/api/channels/general/callCreators';
import { clearOnChainPriceCache } from '../../../../../utils/api/channels/general/ratesAPIs/onChainPrice';
import { API_GET_FIATPRICE, GENERAL } from '../../../../../utils/constants/intervalConstants';
import { SET_RATES } from '../../../../../utils/constants/storeType';
import { isTestnetAccount } from '../../../../../utils/assets/assetIdentity';
import Store from '../../../../../store';
import { expireCoinData } from '../../../updateManager';

const testnetPricesEnabled = () => __DEV__
  && Store.getState().settings.generalWalletSettings.testnetPrices === true;

export const refreshTestnetPrices = () => {
  clearOnChainPriceCache();
  Store.getState().coins.activeCoinsForUser.filter((coin) => coin.testnet).forEach((coin) => {
    Store.dispatch({
      type: SET_RATES,
      payload: { chainTicker: coin.id, channel: GENERAL, body: {} },
    });
    Store.dispatch(expireCoinData(coin.id, API_GET_FIATPRICE));
  });
};

export const updateGeneralFiatPrices = async (coinObj) => {
  const account = Store.getState().authentication.activeAccount;
  const wrongNetwork = isTestnetAccount(account) && !coinObj.testnet;
  const coinRates = wrongNetwork
    ? { result: {}, source: null }
    : await getCoinRates(coinObj, testnetPricesEnabled());

  // Turning the switch off also discards an earlier in-flight testnet price.
  const { result, ...header } = coinRates;
  const stored = Store.getState().ledger.rates[GENERAL]?.[coinObj.id] || {};
  const disabled = wrongNetwork || (coinObj.testnet && !testnetPricesEnabled());
  // An unavailable route also keeps the last quote. Only the explicit
  // testnet policy clears it; network failures still reach ERROR_RATES.
  const body = Object.keys(result).length > 0 ? result : stored;
  return {
    chainTicker: coinObj.id,
    channel: GENERAL,
    header,
    body: disabled ? {} : body,
  };
};
