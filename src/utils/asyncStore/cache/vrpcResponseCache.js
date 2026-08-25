import { Cache } from "react-native-cache";

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiRequest, fromBase58Check } from "verus-typescript-primitives";
import {
  clearCacheNamespace,
  getCacheEntriesSafely,
  initializeCacheSafely,
} from './cacheIntegrity';
const crypto = require('react-native-crypto');

export const VRPC_RESPONSE_CACHE_CAP = 1000
const VRPC_RESPONSE_CACHE_NAMESPACE = "vrpc_response"
const validVrpcResponse = value => {
  if (typeof value !== 'string') return false;
  JSON.parse(value);
  return true;
};

const vrpcResponseCache = new Cache({
  namespace: VRPC_RESPONSE_CACHE_NAMESPACE,
  policy: {
      maxEntries: VRPC_RESPONSE_CACHE_CAP
  },
  backend: AsyncStorage
})

/**
 * @param {string} systemId 
 * @param {string} endpoint 
 * @param {ApiRequest} request 
 * @returns {string}
 */
export const getVrpcResponseCacheKey = (systemId, endpoint, request) => {
  return crypto.createHash('sha256')
                .update(fromBase58Check(systemId).hash)
                .update(Buffer.from(endpoint, 'utf8'))
                .update(Buffer.from(JSON.stringify(request.prepare()), 'utf8'))
                .digest()
                .toString('hex');
}

export const initVrpcResponseCache = () => {
  return initializeCacheSafely(
    vrpcResponseCache,
    VRPC_RESPONSE_CACHE_NAMESPACE,
    VRPC_RESPONSE_CACHE_CAP,
    validVrpcResponse,
  ).catch(e => {
    console.log("Error while initializing vrpc cache")
    throw e
  });
}

/**
 * @param {string} systemId 
 * @param {string} endpoint 
 * @param {ApiRequest} request 
 * @returns 
 */
export const getCachedVrpcResponse = async (systemId, endpoint, request) => {
  const key = getVrpcResponseCacheKey(systemId, endpoint, request);

  const response = await vrpcResponseCache.getItem(key);

  if (response == null) return response;

  try {
    return JSON.parse(response);
  } catch (_) {
    await clearCachedVrpcResponses();
    return null;
  }
}

export const setCachedVrpcResponse = (systemId, endpoint, request, response) => {
  const key = getVrpcResponseCacheKey(systemId, endpoint, request);

  return vrpcResponseCache.setItem(key, JSON.stringify(response)).catch(e => {
    console.log("Error while setting vrpc cache")
    throw e
  })
}

export const clearCachedVrpcResponses = () => {
  return clearCacheNamespace(vrpcResponseCache, VRPC_RESPONSE_CACHE_NAMESPACE).catch(e => {
    console.log("Error while clearing vrpc cache")
    throw e
  })
}

export const getAllCachedVrpcResponses = () => {
  return getCacheEntriesSafely(
    vrpcResponseCache,
    VRPC_RESPONSE_CACHE_NAMESPACE,
    VRPC_RESPONSE_CACHE_CAP,
    validVrpcResponse,
  ).catch(e => {
    console.log("Error while getting all vrpc cache")
    throw e
  })
}
