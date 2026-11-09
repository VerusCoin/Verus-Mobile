import { bigintToHex } from "../../math";
import {createPersistentCache} from './createPersistentCache';

export const ETH_TX_CACHE_CAP = 1000
const ETH_TX_CACHE_NAMESPACE = "eth_tx_receipts"
const validEthTxReceipt = value =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const {
  cache: ethTxReceiptCache,
  initialize: initEthTxReceiptCache,
  getAll: getEthTxReceiptCache,
  clear: clearCachedEthTxReceipts,
} = createPersistentCache({
  namespace: ETH_TX_CACHE_NAMESPACE,
  maxEntries: ETH_TX_CACHE_CAP,
  validateValue: validEthTxReceipt,
  name: 'ethTxReceipt',
  clearMessage: 'Clearing block ethTxReceipt cache',
});

export {initEthTxReceiptCache, getEthTxReceiptCache, clearCachedEthTxReceipts};

export const getCachedEthTxReceipt = (txid) => {
  let key = txid

  return ethTxReceiptCache.getItem(key).catch(e => {
    console.log("Error while getting ethTxReceipt cache")
    throw e
  })
}

export const setCachedEthTxReceipt = (ethTxReceiptObj, txid) => {
  let key = txid

  return ethTxReceiptCache
    .setItem(key, {
      ...ethTxReceiptObj,
      cumulativeGasUsed: bigintToHex(ethTxReceiptObj.cumulativeGasUsed),
      gasUsed: bigintToHex(ethTxReceiptObj.gasUsed),
    })
    .catch((e) => {
      console.log("Error while setting ethTxReceipt cache");
      throw e;
    });
}
