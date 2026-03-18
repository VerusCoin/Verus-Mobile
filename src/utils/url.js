import { URL } from 'react-native-url-polyfill';
import { sha256 } from './crypto/hash';
import { VRPC_API_KEYS, VRPC_API_APP_ID } from '../../env/index';

export const getUrlKey = (uri) => {
  const url = new URL(uri);
  const hash = sha256(url.host);

  return hash.toString('hex');
}

/**
 * @param {string} uri 
 * @returns {import('verusd-rpc-ts-client/lib/VerusdRpcInterface').APIAuthData | undefined}
 */
export const getAuthDataForUrl = (uri) => {
  const urlKey = getUrlKey(uri);

  if (VRPC_API_KEYS[urlKey]) {
    return {
      id: VRPC_API_APP_ID,
      key: VRPC_API_KEYS[urlKey]
    }
  } else return undefined
}