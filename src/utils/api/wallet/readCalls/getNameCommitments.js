import { getApiData } from '../../callCreator'
import { API_GET_NAME_COMMITMENTS } from '../../../constants/intervalConstants'

/**
 * Function to get Verus Identity name commitments for a specified chain
 * @param {String} mode (native only)
 * @param {String} chainTicker Ticker symbol for coin to fetch name commitments for
 */
export const getNameCommitments = async (mode, chainTicker) => {
  let params = {chainTicker}
  let nameCommitments = {}

  try {
    nameCommitments = await getApiData(mode, API_GET_NAME_COMMITMENTS, params)
  } catch (e) {
    throw e
  }
  
  return nameCommitments
}