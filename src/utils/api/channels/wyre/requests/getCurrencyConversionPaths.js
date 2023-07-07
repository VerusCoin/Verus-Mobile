import { coinsList } from "../../../../CoinData/CoinsList"
import { getRates } from "./getRates"

const WYRE_CONVERTABLES = [
  "USD",
  "AUD",
  "EUR",
  "USDCWYRE",
  "USDTWYRE",
  "DAIWYRE",
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
        const destination = coinsList[chainTicker]

        if (chainTicker !== coinObj.id && destination != null && rates[destination.currency_id] != null) {
          processedConversions[chainTicker] = {
            destination,
            price: rates[destination.currency_id],
          };
        }
      }
  
      return processedConversions
    } 
  }
  
  return {}
}