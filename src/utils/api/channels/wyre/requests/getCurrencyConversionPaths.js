import { coinsList } from "../../../../CoinData/CoinsList"
import { getRates } from "./getRates"

const { btc, aud, eur, usd, eth, usdt, usdc, dai } = coinsList

const COMPATIBLE_WYRE_CONVERSIONS = {
  ["USD"]: {
    ["AUD"]: { destination: aud },
    ["EUR"]: { destination: eur },
    ["USDT"]: { destination: usdt },
    ["USDC"]: { destination: usdc },
    ["DAI"]: { destination: dai }
  },
  ["AUD"]: {
    ["USD"]: { destination: usd },
    ["USDT"]: { destination: usdt },
    ["EUR"]: { destination: eur },
    ["USDC"]: { destination: usdc },
    ["DAI"]: { destination: dai }
  },
  ["EUR"]: {
    ["USD"]: { destination: usd },
    ["AUD"]: { destination: aud },
    ["USDT"]: { destination: usdt },
    ["USDC"]: { destination: usdc },
    ["DAI"]: { destination: dai }
  },
  ["USDC"]: {
    ["USD"]: { destination: usd },
    ["AUD"]: { destination: aud },
    ["USDT"]: { destination: usdt },
    ["EUR"]: { destination: eur },
    ["DAI"]: { destination: dai }
  },
  ["USDT"]: {
    ["USD"]: { destination: usd },
    ["AUD"]: { destination: aud },
    ["USDC"]: { destination: usdc },
    ["EUR"]: { destination: eur },
    ["DAI"]: { destination: dai }
  },
  ["DAI"]: {
    ["USD"]: { destination: usd },
    ["AUD"]: { destination: aud },
    ["USDC"]: { destination: usdc },
    ["USDT"]: { destination: usdt },
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