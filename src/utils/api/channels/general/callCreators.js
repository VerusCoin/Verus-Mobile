import { getCoinPaprikaRate } from './ratesAPIs/coinPaprika';
import { getAtomicExplorerBTCFees } from './btcFeesAPIs/atomicExplorer';
import { getFiatExchangeRates } from './ratesAPIs/fiatExchangeRates'
import ApiException from '../../errors/apiError';
import { GENERAL, USD } from '../../../constants/intervalConstants';
import { CONNECTION_ERROR } from '../../errors/errorMessages';
import { GENERAL_CONNECTION_ERROR } from '../../errors/errorCodes';


export const getRecommendedBTCFees = () => {
  //Fees are measured in satoshis per byte, slowest should 
  //take around an hour, average should take around 30 minutes, 
  //and fastest should take around 20 to 30 minutes
  let feeFunctions = [getAtomicExplorerBTCFees()]

  return new Promise((resolve, reject) => {
    Promise.all(feeFunctions)
    .then((fees) => {
      let feesFound = []

      for (let i = 0; i < fees.length; i++) {
        if (fees[i]) {
          feesFound.push(fees[i])
        }
      }

      if (feesFound.length > 0) {
        let avgFees = {slowest: 0, average: 0, fastest: 0}

        for (let i = 0; i < feesFound.length; i++) {
          avgFees.slowest += feesFound[i].slowest
          avgFees.average += feesFound[i].average
          avgFees.fastest += feesFound[i].fastest
        }

        for (let key in avgFees) {
          avgFees[key] = truncateDecimal((avgFees[key]/feesFound.length), 0)
        }

        resolve(avgFees)
      }
      else {
        resolve(false)
      }
    })
  });
}

export const getCoinRates = (coinObj) => {
  // Functions that can get rates for different coins. Due to the nature of Promise.all, 
  // these should not reject, but instead resolve with an object that either has a
  // 'result' property, or an 'error' property.
  let rateFunctions = [getCoinPaprikaRate(coinObj)]
  let rateUsd = null
  let source = null

  return new Promise((resolve, reject) => {
    Promise.all(rateFunctions)
      .then(rates => {
        rates = rates.filter(rate => rate.error == null)

        if (rates.length > 0) {
          rateUsd = rates[0].result.rate
          source = rates[0].result.source
          
          return getFiatExchangeRates()
        } else
          reject(
            new ApiException(
              CONNECTION_ERROR,
              "No valid coin rates found",
              coinObj.id,
              GENERAL,
              GENERAL_CONNECTION_ERROR
            )
          );
      })
      .then(exchangeRates => {
        let resObj = { result: { [USD]: rateUsd }, source }

        Object.keys(
          exchangeRates.result == null ? {} : exchangeRates.result
        ).map(fiatCurr => {
          resObj.result[fiatCurr] = exchangeRates.result[fiatCurr] * rateUsd;
        });

        resolve(resObj)
      })
      .catch(error => {
        reject(
          new ApiException(
            CONNECTION_ERROR,
            error.message || "Error connecting to rates APIs",
            coinObj.id,
            GENERAL,
            error.code || GENERAL_CONNECTION_ERROR
          )
        );
      });
  });
}