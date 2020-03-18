import { getApiData } from '../../callCreator'
import { API_GET_INFO } from '../../../constants/intervalConstants'

/**
 * Function to get general info for specific mode (returns server info for electrum, eth network info, or chain info)
 * @param {String} mode native || electrum || eth
 * @param {String} chainTicker Ticker symbol for coin to fetch info for
 */
export const getInfo = async (mode, chainTicker) => {
  const params = {chainTicker}
  let info = {}

  try {
    info = await getApiData(mode, API_GET_INFO, params)
  } catch (e) {
    throw e
  }
  
  return info
}