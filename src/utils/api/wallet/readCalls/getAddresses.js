import { getApiData } from '../../callCreator'
import { API_GET_ADDRESSES } from '../../../constants/intervalConstants'

/**
 * Function to get addresses for specific mode 
 * @param {String} mode native || electrum || eth
 * @param {String} chainTicker Ticker symbol for coin to fetch addresses for
 * @param {Boolean} includePrivate Include private addresses (native only)
 */
export const getAddresses = async (mode, chainTicker, includePrivate = false) => {
  const params = {chainTicker, includePrivate}
  let addresses = {}

  try {
    addresses = await getApiData(mode, API_GET_ADDRESSES, params)
  } catch (e) {
    throw e
  }
  
  return addresses
}