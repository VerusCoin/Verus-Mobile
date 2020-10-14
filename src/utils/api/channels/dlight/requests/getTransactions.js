import { makeDlightRequest } from '../callCreators'
import { DLIGHT_TRANSACTIONS } from '../../../../constants/dlightConstants'

// Get the transactions associated with a light daemon wallet
// based on tx type (either "pending", "cleared", "received", "sent", or "all")
export const getZTransactions = (coinId, accountHash, coinProto, transactionType) => {
  return makeDlightRequest(coinId, accountHash, coinProto, 0, DLIGHT_TRANSACTIONS, [transactionType == null ? "all" : transactionType])
}