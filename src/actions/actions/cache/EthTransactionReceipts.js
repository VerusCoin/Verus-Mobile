import {
  getEthTxReceiptCache,
  setCachedEthTxReceipt,
  clearCachedEthTxReceipts,
} from '../../../utils/asyncStore/asyncStore';

import { ETH_TRANSACTION_RECEIPT_CAP } from '../../../../env/index'

import {
  setEthTxReceipts
} from '../../actionCreators'
import { hexToBigint } from '../../../utils/math';

export const loadEthTxReceipts = async dispatch => {
  const txReceipts = await getEthTxReceiptCache();
  let txReceiptsParsed = {};

  try {
    if (txReceipts == null || typeof txReceipts !== "object" || Array.isArray(txReceipts)) {
      throw new Error("Invalid transaction receipt cache");
    }

    for (const key of Object.keys(txReceipts)) {
      const entry = txReceipts[key];
      if (
        entry == null ||
        typeof entry !== "object" ||
        !("value" in entry)
      ) {
        throw new Error("Invalid transaction receipt cache entry");
      }

      const jsonParsedValue =
        typeof entry.value === "string"
          ? JSON.parse(entry.value)
          : entry.value;
      if (jsonParsedValue == null || typeof jsonParsedValue !== "object") {
        throw new Error("Invalid transaction receipt cache value");
      }

      txReceiptsParsed[key] = {
        ...jsonParsedValue,
        gasUsed: hexToBigint(jsonParsedValue.gasUsed),
        cumulativeGasUsed: hexToBigint(
          jsonParsedValue.cumulativeGasUsed
        ),
      };
    }
  } catch (parseError) {
    await clearCachedEthTxReceipts();
    txReceiptsParsed = {};
  }

  dispatch(setEthTxReceipts(txReceiptsParsed));
};

export const saveEthTxReceipt = async (receipt, txid, store) => {
  const numReceipts = Object.keys(store.getState().ethtxreceipts.txReceipts).length;
  await setCachedEthTxReceipt(receipt, txid);

  if (numReceipts < ETH_TRANSACTION_RECEIPT_CAP) {
    await loadEthTxReceipts(store.dispatch);
  }
};
