import { Cache } from "react-native-cache"
//Cache library built on AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { bigintToHex } from "../../math";
import {
  clearCacheNamespace,
  getCacheEntriesSafely,
  initializeCacheSafely,
} from './cacheIntegrity';

export const ETH_TX_CACHE_CAP = 1000
const ETH_TX_CACHE_NAMESPACE = "eth_tx_receipts"
const validEthTxReceipt = value =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const ethTxReceiptCache = new Cache({
  namespace: ETH_TX_CACHE_NAMESPACE,
  policy: {
      maxEntries: ETH_TX_CACHE_CAP
  },
  backend: AsyncStorage
})

export const initEthTxReceiptCache = () => {
  return initializeCacheSafely(
    ethTxReceiptCache,
    ETH_TX_CACHE_NAMESPACE,
    ETH_TX_CACHE_CAP,
    validEthTxReceipt,
  ).catch(e => {
    console.log("Error while initializing ethTxReceipt cache")
    throw e
  })
}

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

export const clearCachedEthTxReceipts = () => {
  console.log("Clearing block ethTxReceipt cache")
  return clearCacheNamespace(ethTxReceiptCache, ETH_TX_CACHE_NAMESPACE).catch(e => {
    console.log("Error while clearing ethTxReceipt cache")
    throw e
  })
}

export const getEthTxReceiptCache = () => {
  return getCacheEntriesSafely(
    ethTxReceiptCache,
    ETH_TX_CACHE_NAMESPACE,
    ETH_TX_CACHE_CAP,
    validEthTxReceipt,
  ).catch(e => {
    console.log("Error while getting all ethTxReceipt cache")
    throw e
  })
}
