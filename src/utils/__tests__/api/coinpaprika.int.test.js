import { findCoinObj, fullCoinList } from '../../CoinData/CoinData';
import { REQUEST_TIMEOUT_MS } from '../../../../env/index';
import { timeout } from '../../promises';
import { isJson } from '../../objectManip';

describe('coinpaprika API is online and works as expected', () => {
  const testCoinID = (coinID) => {
    const _coinID = coinID

    return it(`basic fetch from coinpaprika API for ${coinID}`, () => {  
      let coinObj = findCoinObj(_coinID, "")
      let coinID = coinObj.id
      let coinName = coinObj.display_name
      let param = (coinID.toLowerCase()) + '-' + (coinName.replace(/ /g,"-")).toLowerCase()
  
      const address = `https://api.coinpaprika.com/v1/coins/${param}/ohlcv/latest unmock`
  
      return new Promise((resolve, reject) => {
        timeout(REQUEST_TIMEOUT_MS, fetch(address, { method: "GET" }))
          .then(response => {
            if (!isJson(response)) {
              throw new Error(
                "Invalid JSON in coinPaprika.js, received: " + response
              );
            }
  
            return response.json();
          })
          .then(response => {
            if (response.error || !response || !response[0] || !response[0].close) {
              reject(new Error(`Failed to get price for ${_coinID} through CoinPaprika API.`));
            } else {
              resolve({result: { rate: response[0].close, source: address }});
            }
          })
          .catch(error => {
            reject(error);
          });
      });
    })
  }

  for (const name of fullCoinList) {
    testCoinID(name)
  }
})