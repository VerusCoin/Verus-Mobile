import { Cache } from "react-native-cache"
//Cache library built on AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearCacheNamespace,
  getCacheEntriesSafely,
  initializeCacheSafely,
} from './cacheIntegrity';

export const BLOCK_HEADER_CACHE_CAP = 1000
const BLOCK_HEADER_CACHE_NAMESPACE = "block_header"
const validBlockHeader = value => {
  if (typeof value !== 'string') return false;

  const parsed = JSON.parse(value);
  return parsed != null && typeof parsed === 'object' && !Array.isArray(parsed);
};

const headerCache = new Cache({
  namespace: BLOCK_HEADER_CACHE_NAMESPACE,
  policy: {
      maxEntries: BLOCK_HEADER_CACHE_CAP
  },
  backend: AsyncStorage
})

export const initHeaderCache = () => {
  return initializeCacheSafely(
    headerCache,
    BLOCK_HEADER_CACHE_NAMESPACE,
    BLOCK_HEADER_CACHE_CAP,
    validBlockHeader,
  ).catch(e => {
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
  return clearCacheNamespace(headerCache, BLOCK_HEADER_CACHE_NAMESPACE).catch(e => {
    console.log("Error while clearing header cache")
    throw e
  })
}

export const getHeaderCache = () => {
  return getCacheEntriesSafely(
    headerCache,
    BLOCK_HEADER_CACHE_NAMESPACE,
    BLOCK_HEADER_CACHE_CAP,
    validBlockHeader,
  ).catch(e => {
    console.log("Error while getting all header cache")
    throw e
  })
}
