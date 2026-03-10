import { URL } from 'react-native-url-polyfill';
import { sha256 } from './crypto/hash';

export const getUrlKey = (uri) => {
  const url = new URL(uri);
  const hash = sha256(url.host);

  return hash.toString('hex');
}