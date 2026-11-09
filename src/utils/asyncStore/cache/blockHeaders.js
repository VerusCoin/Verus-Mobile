import {createPersistentCache} from './createPersistentCache';

export const BLOCK_HEADER_CACHE_CAP = 1000
const BLOCK_HEADER_CACHE_NAMESPACE = "block_header"
const validBlockHeader = value => {
  if (typeof value !== 'string') return false;

  const parsed = JSON.parse(value);
  return parsed != null && typeof parsed === 'object' && !Array.isArray(parsed);
};

const {
  cache: headerCache,
  initialize: initHeaderCache,
  getAll: getHeaderCache,
  clear: clearCachedHeaders,
} = createPersistentCache({
  namespace: BLOCK_HEADER_CACHE_NAMESPACE,
  maxEntries: BLOCK_HEADER_CACHE_CAP,
  validateValue: validBlockHeader,
  name: 'header',
  clearMessage: 'Clearing block header cache',
});

export {initHeaderCache, getHeaderCache, clearCachedHeaders};

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
