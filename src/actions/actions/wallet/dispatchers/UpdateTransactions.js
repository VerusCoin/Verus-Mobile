import { getZTransactions } from '../../../../utils/api/channels/dlight/callCreators'
import { getParsedTransactionList } from '../../../../utils/api/channels/electrum/callCreators'
import { ERROR_TRANSACTIONS, SET_TRANSACTIONS } from '../../../../utils/constants/storeType'
import { DLIGHT, ELECTRUM } from '../../../../utils/constants/intervalConstants'
import { getCoinObj } from '../../../../utils/CoinData/CoinData'
import { standardizeDlightTxObj } from '../../../../utils/standardization/standardizeTxObj'

/**
 * Fetches the appropriate data from the store for the specified channel's transaction
 * update and dispatches a balance update or error action to the store.
 * @param {Object} state Reference to redux store state
 * @param {Function} dispatch Redux action dispatch function
 * @param {String[]} channels The enabled channels for the information request e.g. ['electrum', 'dlight']
 * @param {String} chainTicker Chain ticker id for chain to fetch balances for
 */
export const updateTransactions = async (state, dispatch, channels, chainTicker) => {
  const activeUser = state.authentication.activeAccount
  const { accountHash } = activeUser
  const coinObj = getCoinObj(state.coins.activeCoinsForUser, chainTicker) 
  let channelsPassed = []

  await Promise.all(channels.map(async (channel) => {
    if (channel === DLIGHT && global.ENABLE_DLIGHT) {
      try {
        const zTransactions = await getZTransactions(chainTicker, accountHash, coinObj.proto)
        const { result, ...header } = zTransactions
        
        dispatch({
          type: SET_TRANSACTIONS,
          payload: {
            chainTicker,
            channel,
            header,
            body: result.map(standardizeDlightTxObj)
          }
        });
        channelsPassed.push(channel)
      } catch (error) {
        dispatch({ type: ERROR_TRANSACTIONS, payload: { error } });
      }
    } else if (channel === ELECTRUM) {
      //TODO: Change to use app config for max list length
      try {
        const transactions = await getParsedTransactionList(coinObj, activeUser, 10)
        const { result, ...header } = transactions

        dispatch({
          type: SET_TRANSACTIONS,
          payload: {
            chainTicker,
            channel,
            header,
            body: result
          }
        });
        channelsPassed.push(channel)
      } catch (error) {
        dispatch({ type: ERROR_TRANSACTIONS, payload: { error }})
      }
    }
  }))

   return channelsPassed.length === channels.length
}