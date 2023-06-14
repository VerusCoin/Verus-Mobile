import { Cache } from "react-native-cache";

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiRequest, fromBase58Check } from "verus-typescript-primitives";
const crypto = require('react-native-crypto');

export const VRPC_RESPONSE_CACHE_CAP = 1000

const vrpcResponseCache = new Cache({
  namespace: "vrpc_response",
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
const getCacheKey = (systemId, endpoint, request) => {
  return crypto.createHash('sha256')
                .update(fromBase58Check(systemId).hash)
                .update(Buffer.from(endpoint, 'utf8'))
                .update(Buffer.from(JSON.stringify(request.prepare()), 'utf8'))
                .digest()
                .toString('hex');
}

export const initVrpcResponseCache = () => {
  return vrpcResponseCache.initializeCache().catch(e => {
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
  const key = getCacheKey(systemId, endpoint, request);

  const response = await vrpcResponseCache.getItem(key);

  if (response == null) return response;
  else return JSON.parse(response);
}

export const setCachedVrpcResponse = (systemId, endpoint, request, response) => {
  const key = getCacheKey(systemId, endpoint, request);

  return vrpcResponseCache.setItem(key, JSON.stringify(response)).catch(e => {
    console.log("Error while setting vrpc cache")
    throw e
  })
}

export const clearCachedVrpcResponses = () => {
  return vrpcResponseCache.clearAll().catch(e => {
    console.log("Error while clearing vrpc cache")
    throw e
  })
}

export const getAllCachedVrpcResponses = () => {
  return vrpcResponseCache.getAll().catch(e => {
    console.log("Error while getting all vrpc cache")
    throw e
  })
}
