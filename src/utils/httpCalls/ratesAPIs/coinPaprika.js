import { timeout } from '../../promises'
import { isJson } from '../../objectManip'

export const getCoinPaprikaRate = (coinObj) => {
  let coinID = coinObj.id
  let coinName = coinObj.name
  let param = (coinID.toLowerCase()) + '-' + (coinName.replace(/ /g,"-")).toLowerCase()

  const address = `https://api.coinpaprika.com/v1/coins/${param}/ohlcv/latest`

  return new Promise((resolve, reject) => {
    timeout(global.REQUEST_TIMEOUT_MS, fetch(address, {method: 'GET'}))
    .then((response) => {
      if (!isJson(response)) {
        throw new Error("Invalid JSON in coinPaprika.js, received: " + response)
      }

      return response.json()
    })
    .then((response) => {
      if (response.error || !response || !response[0] || !response[0].close) {
        console.log(`Failed to get price for ${coinID} through CoinPaprika API:`)
        console.log(`url: ${address}`)
        console.log(response)
        resolve(false)
      }
      else {
        resolve(response[0].close)
      }
    })
    .catch((err) => {
      console.warn(err.message + " in coinPaprika.js")
      resolve(false)
    })
  });
}