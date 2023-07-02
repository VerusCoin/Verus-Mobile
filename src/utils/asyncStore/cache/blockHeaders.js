import { Cache } from "react-native-cache"
//Cache library built on AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';

export const BLOCK_HEADER_CACHE_CAP = 1000

const headerCache = new Cache({
  namespace: "block_header",
  policy: {
      maxEntries: BLOCK_HEADER_CACHE_CAP
  },
  backend: AsyncStorage
})

export const initHeaderCache = () => {
  return headerCache.initializeCache().catch(e => {
    console.log("Error while initializing header cache")
    throw e
  })
}

export const getCachedHeader = (blockHeight, coinID) => {
  let key = `${coinID}.${blockHeight}`

  return headerCache.getItem(key).catch(e => {
    console.log("Error while getting header cache")
    throw e
  })
}

export const setCachedHeader = (headerObj, height, coinID) => {
  let key = `${coinID}.${height}`

  return headerCache.setItem(key, JSON.stringify(headerObj)).catch(e => {
    console.log("Error while setting header cache")
    throw e
  })
}

export const clearCachedHeaders = () => {
  console.log("Clearing block header cache")
  return headerCache.clearAll().catch(e => {
    console.log("Error while clearing header cache")
    throw e
  })
}

export const getHeaderCache = () => {
  return headerCache.getAll().catch(e => {
    console.log("Error while getting all header cache")
    throw e
  })
}
