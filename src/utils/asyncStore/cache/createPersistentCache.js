import AsyncStorage from '@react-native-async-storage/async-storage';
import {Cache} from 'react-native-cache';
import {
  clearCacheNamespace,
  getCacheEntriesSafely,
  initializeCacheSafely,
} from './cacheIntegrity';

// Share lifecycle handling only; each cache retains its key and value encoding.
export const createPersistentCache = ({
  namespace,
  maxEntries,
  validateValue,
  name,
  clearMessage,
  getAllOperation = 'getting all',
}) => {
  const cache = new Cache({
    namespace,
    policy: {maxEntries},
    backend: AsyncStorage,
  });
  const reportError = operation => error => {
    console.log(`Error while ${operation} ${name} cache`);
    throw error;
  };

  return {
    cache,
    initialize: () => initializeCacheSafely(
      cache, namespace, maxEntries, validateValue,
    ).catch(reportError('initializing')),
    getAll: () => getCacheEntriesSafely(
      cache, namespace, maxEntries, validateValue,
    ).catch(reportError(getAllOperation)),
    clear: () => {
      if (clearMessage != null) console.log(clearMessage);
      return clearCacheNamespace(cache, namespace).catch(reportError('clearing'));
    },
  };
};
