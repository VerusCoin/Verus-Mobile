/* eslint-disable import/no-cycle -- The shared VRPC provider is initialized through Redux dispatchers. */
/* global __DEV__ */
import BigNumber from 'bignumber.js';
import { getCoinPaprikaRate } from './ratesAPIs/coinPaprika';
import { getOnChainRate } from './ratesAPIs/onChainPrice';
import { getMempoolSpaceBTCFees } from './btcFeesAPIs/mempoolSpace';
import { getBlockchainComBTCFees } from './btcFeesAPIs/blockchainCom';
import { getFiatExchangeRates } from './ratesAPIs/fiatExchangeRates';
import ApiException from '../../errors/apiError';
import { GENERAL } from '../../../constants/intervalConstants';
import { USD } from '../../../constants/currencies';
import { CONNECTION_ERROR } from '../../errors/errorMessages';
import { GENERAL_CONNECTION_ERROR } from '../../errors/errorCodes';

export const getRecommendedBTCFees = async (testnet = false, maximum) => {
  const primary = await getMempoolSpaceBTCFees(maximum, testnet);
  if (primary) return primary;
  return await getBlockchainComBTCFees(maximum);
};

export const getCoinRates = async (coinObj, testnetPricesEnabled = false) => {
  if (coinObj.testnet && !(__DEV__ && testnetPricesEnabled && coinObj.proto === 'vrsc')) {
    return { result: {}, source: null };
  }

  try {
    const response = coinObj.proto === 'vrsc' || coinObj.price_currency_id
      ? await getOnChainRate(coinObj)
      : await getCoinPaprikaRate(coinObj);
    if (response.error) throw response.error;

    const { rate: rateUsd, source } = response.result;
    if (rateUsd == null) return { result: {}, source };

    const exchangeRates = await getFiatExchangeRates();
    const result = { [USD]: BigNumber(rateUsd) };
    Object.keys(exchangeRates.result || {}).forEach((fiatCurr) => {
      result[fiatCurr] = BigNumber(exchangeRates.result[fiatCurr]).multipliedBy(rateUsd)
        .toString();
    });
    return { result, source };
  } catch (error) {
    throw new ApiException(
      CONNECTION_ERROR,
      error.message || 'Error connecting to rates APIs',
      coinObj.id,
      GENERAL,
      error.code || GENERAL_CONNECTION_ERROR,
    );
  }
};
