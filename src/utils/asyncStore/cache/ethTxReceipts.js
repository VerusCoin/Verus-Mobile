import { Cache } from "react-native-cache"
//Cache library built on AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { bigintToHex } from "../../math";

export const ETH_TX_CACHE_CAP = 1000

const ethTxReceiptCache = new Cache({
  namespace: "eth_tx_receipts",
  policy: {
      maxEntries: ETH_TX_CACHE_CAP
  },
  backend: AsyncStorage
})

export const initEthTxReceiptCache = () => {
  return ethTxReceiptCache.initializeCache().catch(e => {
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
  return ethTxReceiptCache.clearAll().catch(e => {
    console.log("Error while clearing ethTxReceipt cache")
    throw e
  })
}

export const getEthTxReceiptCache = () => {
  return ethTxReceiptCache.getAll().catch(e => {
    console.log("Error while getting all ethTxReceipt cache")
    throw e
  })
}
