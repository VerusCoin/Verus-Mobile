import { getApiData } from '../../callCreator'
import { API_GET_BALANCES } from '../../../constants/intervalConstants'

/**
 * Function to get all balance types for all addresses in specified mode
 * @param {String} mode native || electrum || eth
 * @param {String} chainTicker Ticker symbol for coin to fetch balances for
 * @param {Boolean} includePrivate Whether or not to includePrivate balances if call is made in native mode
 */
export const getAllBalances = async (mode, chainTicker, includePrivate = null) => {
  const params = {chainTicker, includePrivate}
  let balances = {}

  try {
    balances = await getApiData(mode, API_GET_BALANCES, params)
  } catch (e) {
    throw e
  }
  
  return balances
}