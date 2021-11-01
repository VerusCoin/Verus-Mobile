import { coinsList } from "../../../../CoinData/CoinsList"
import { getRates } from "./getRates"

const WYRE_CONVERTABLES = [
  "USD",
  "AUD",
  "EUR",
  "USDC",
  "USDT",
  "DAI",
  "CHF",
  "MXN",
  "CLP",
  "ZAR",
  "VND",
  "ILS",
  "HKD",
  "DKK",
  "CAD",
  "MYR",
  "NOK",
  "CZK",
  "SEK",
  "ARS",
  "INR",
  "THB",
  "KRW",
  "JPY",
  "PLN",
  "GBP",
  "PHP",
  "ISK",
  "COP",
  "SGD",
  "NZD",
  "BRL",
];

export const getCurrencyConversionPaths = async (coinObj) => {
  if (WYRE_CONVERTABLES.includes(coinObj.id)) {
    const rates = await getRates(coinObj)
  
    if (rates != null) {
      let processedConversions = {}

      for (const chainTicker of WYRE_CONVERTABLES) {
        const destination = coinsList[chainTicker.toLowerCase()]

        if (chainTicker !== coinObj.id && destination != null && rates[destination.id] != null) {
          processedConversions[chainTicker] = {
            destination,
            price: rates[destination.id],
          };
        }
      }
  
      return processedConversions
    } 
  }
  
  return {}
}