import { coinsList } from "../../../../CoinData/CoinsList"
import { getRates } from "./getRates"

const { btc, aud, eur, usd, eth } = coinsList

const COMPATIBLE_WYRE_CONVERSIONS = {
  ["BTC"]: {
    ["USD"]: { destination: usd },
    ["AUD"]: { destination: aud },
    ["EUR"]: { destination: eur },
    ["ETH"]: { destination: eth },
  },
  ["USD"]: {
    ["AUD"]: { destination: aud },
    ["EUR"]: { destination: eur },
    ["BTC"]: { destination: btc },
    ["ETH"]: { destination: eth },
  },
  ["AUD"]: {
    ["USD"]: { destination: usd },
    ["BTC"]: { destination: btc },
    ["EUR"]: { destination: eur },
    ["ETH"]: { destination: eth },
  },
  ["EUR"]: {
    ["USD"]: { destination: usd },
    ["AUD"]: { destination: aud },
    ["BTC"]: { destination: btc },
    ["ETH"]: { destination: eth },
  },
  ["ETH"]: {
    ["USD"]: { destination: usd },
    ["AUD"]: { destination: aud },
    ["BTC"]: { destination: btc },
    ["EUR"]: { destination: eur },
  },
}

export const getCurrencyConversionPaths = async (coinObj) => {
  const conversions = COMPATIBLE_WYRE_CONVERSIONS[coinObj.id]
  const rates = await getRates(coinObj)
  
  if (conversions != null && rates != null) {
    let processedConversions = {}

    Object.keys(conversions).map(chainTicker => {
      processedConversions[chainTicker] = {
        ...conversions[chainTicker],
        price: rates[conversions[chainTicker].destination.id]
      }
    })

    return processedConversions
  } else return {}
}