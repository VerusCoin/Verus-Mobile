import { getApiData } from '../../callCreator'
import { API_GET_TRANSACTIONS } from '../../../constants/intervalConstants'

/**
 * The call to get a list of transactions based on coin mode
 * @param {String} mode native || electrum || eth
 * @param {String} chainTicker Ticker symbol for coin to fetch txs for
 * @param {String} ethnetwork The ethereum network this call is being made on (only for ETH mode) e.g. 'ropsten'
 * @param {Boolean} includePrivate Whether or not to includePrivate txs if call is made in native mode
 */
export const getTransactions = async (mode, chainTicker, ethnetwork = null, includePrivate = null, maxPubTransactions) => {

  const params = {chainTicker, ethnetwork, includePrivate, maxPubTransactions}
  let transactions = {}

  try {
    transactions = await getApiData(mode, API_GET_TRANSACTIONS, params)
  } catch (e) {
    throw e
  }
  
  return transactions
}