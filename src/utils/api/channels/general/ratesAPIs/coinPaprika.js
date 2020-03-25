import { timeout } from '../../../../promises'
import { isJson } from '../../../../objectManip'

export const getCoinPaprikaRate = (coinObj) => {
  let coinID = coinObj.id
  let coinName = coinObj.name
  let param = (coinID.toLowerCase()) + '-' + (coinName.replace(/ /g,"-")).toLowerCase()

  const address = `https://api.coinpaprika.com/v1/coins/${param}/ohlcv/latest`

  return new Promise((resolve) => {
    timeout(global.REQUEST_TIMEOUT_MS, fetch(address, { method: "GET" }))
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
          resolve({error: new Error(`Failed to get price for ${coinID} through CoinPaprika API.`)});
        } else {
          resolve({result: { rate: response[0].close, source: address }});
        }
      })
      .catch(error => {
        resolve({error});
      });
  });
}