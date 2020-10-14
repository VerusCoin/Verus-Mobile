/*
  This reducer stores the cache for eth transactions.
*/

import { ADD_ETH_TX_RECEIPT, SET_ETH_TX_RECEIPTS, CLEAR_CACHE } from "../../utils/constants/storeType";

export const ethtxreceipts = (state = {
  txReceipts: {}
}, action) => {
  switch (action.type) {
    case ADD_ETH_TX_RECEIPT:
      return {
        ...state, 
        txReceipts: {...state.txReceipts, [action.key]: action.receipt},
      };
    case SET_ETH_TX_RECEIPTS:
      return {
        ...state, 
        txReceipts: action.receipts,
      };
    case CLEAR_CACHE:
      return {
        ...state, 
        txReceipts: {},
      };
    default:
      return state;
  }
}