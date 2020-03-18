import { getApiData } from '../../callCreator'
import { API_GET_FIATPRICE, GET } from '../../../constants/intervalConstants'

/**
 * Function to get a fiat price value for a specified coin (if it exists)
 * @param {String} mode native || electrum || eth
 * @param {String} chainTicker Ticker symbol for coin to fetch balances for
 */
export const getFiatPrice = async (mode, chainTicker, currency) => {
  let params = {chainTicker}
  if (currency) params.currency = currency
  let fiatPrice = {}

  try {
    fiatPrice = await getApiData(mode, API_GET_FIATPRICE, params, GET)
  } catch (e) {
    throw e
  }
  
  return fiatPrice
}