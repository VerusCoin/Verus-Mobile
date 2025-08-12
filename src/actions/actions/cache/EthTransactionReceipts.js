import {
  getEthTxReceiptCache,
  setCachedEthTxReceipt
} from '../../../utils/asyncStore/asyncStore';

import { ETH_TRANSACTION_RECEIPT_CAP } from '../../../../env/index'

import {
  setEthTxReceipts
} from '../../actionCreators'
import { hexToBigint } from '../../../utils/math';

export const loadEthTxReceipts = (dispatch) => {
  return new Promise((resolve) => {
    getEthTxReceiptCache()
    .then(txReceipts => {
      let txReceiptsParsed = {}

      for (let key in txReceipts) {
        const jsonParsedValue = JSON.parse(txReceipts[key]).value
        txReceiptsParsed[key] = {
          ...jsonParsedValue,
          gasUsed: hexToBigint(jsonParsedValue.gasUsed),
          cumulativeGasUsed: hexToBigint(
            jsonParsedValue.cumulativeGasUsed
          ),
        };
      }

      dispatch(setEthTxReceipts(txReceiptsParsed))
      resolve()
    })
    .catch(e => {
      throw e
    })
  })
}

export const saveEthTxReceipt = (receipt, txid, store) => {
  let numReceipts = Object.keys(store.getState().ethtxreceipts.txReceipts).length

  return new Promise((resolve, reject) => {
    setCachedEthTxReceipt(receipt, txid)
    .then(() => {
      if (numReceipts >= ETH_TRANSACTION_RECEIPT_CAP) {
        return false
      } else {
        return loadEthTxReceipts(store.dispatch)
      }
    })
    .then(() => {
      resolve()
    })
    .catch(e => {
      throw e
    })
  })
}