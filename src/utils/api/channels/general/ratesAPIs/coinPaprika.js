import { timeout } from '../../../../promises'
import { isJson } from '../../../../objectManip'

import { REQUEST_TIMEOUT_MS } from '../../../../../../env/index'
import axios from 'axios'

export const getCoinPaprikaRate = (coinObj) => {
  let coinID = coinObj.id
  let coinName = coinObj.display_name
  let param =
    coinObj.rate_url_params != null && coinObj.rate_url_params.coin_paprika != null
      ? coinObj.rate_url_params.coin_paprika
      : coinID.toLowerCase() + "-" + coinName.replace(/ /g, "-").toLowerCase();

  const address = `https://api.coinpaprika.com/v1/coins/${param}/ohlcv/latest`

  return new Promise((resolve) => {
    axios.get(address)
      .then(res => {
        if (!isJson(res.data)) {
          throw new Error(
            "Invalid JSON in coinPaprika.js, received: " + res
          );
        }

        const response = res.data
        
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