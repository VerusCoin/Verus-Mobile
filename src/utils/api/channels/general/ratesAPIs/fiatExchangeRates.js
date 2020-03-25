import { timeout } from '../../../../promises'
import { isJson } from '../../../../objectManip'

export const getFiatExchangeRates = () => {
  const address = `https://api.exchangeratesapi.io/latest?base=USD`

  return new Promise((resolve, reject) => {
    timeout(global.REQUEST_TIMEOUT_MS, fetch(address, {method: 'GET'}))
    .then((response) => {
      if (!isJson(response)) {
        throw new Error("Invalid JSON in fiatExchangeRates.js, received: " + response)
      }

      return response.json()
    })
    .then((response) => {
      if (response.error || !response || !response.rates) {
        resolve({error: new Error("Fiat exchange rate response unreadable.")})
      } else {
        resolve({result: response.rates});
      }
    })
    .catch((error) => {
      resolve({error})
    })
  });
}