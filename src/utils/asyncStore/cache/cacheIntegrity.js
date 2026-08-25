import AsyncStorage from '@react-native-async-storage/async-storage';

export class CacheCorruptionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CacheCorruptionError';
  }
}

const lruKeyFor = namespace => `${namespace}:_lru`;
const namespacePrefixFor = namespace => `${namespace}:`;

const parseJson = (value, description) => {
  try {
    return JSON.parse(value);
  } catch (_) {
    throw new CacheCorruptionError(`Malformed ${description}`);
  }
};

const parseEntry = (rawValue, key) => {
  if (typeof rawValue !== 'string') {
    throw new CacheCorruptionError(`Missing cache entry ${key}`);
  }

  // react-native-cache 2.x double serializes entries in setItem(): the first
  // parse produces the serialized entry string. Accept single serialization as
  // well so upgrades do not discard otherwise valid data.
  const outerValue = parseJson(rawValue, `cache entry ${key}`);
  const entry =
    typeof outerValue === 'string'
      ? parseJson(outerValue, `cache entry ${key}`)
      : outerValue;

  if (
    entry == null ||
    typeof entry !== 'object' ||
    Array.isArray(entry) ||
    !Object.prototype.hasOwnProperty.call(entry, 'value')
  ) {
    throw new CacheCorruptionError(`Invalid cache entry ${key}`);
  }

  return entry;
};

const readCacheSnapshot = async (namespace, maxEntries, validateValue) => {
  const prefix = namespacePrefixFor(namespace);
  const lruKey = lruKeyFor(namespace);
  const allKeys = await AsyncStorage.getAllKeys();
  const namespaceKeys = allKeys.filter(key => key.startsWith(prefix));
  const storedValues =
    namespaceKeys.length === 0 ? [] : await AsyncStorage.multiGet(namespaceKeys);
  const storedValueMap = new Map(storedValues);
  const entryKeys = namespaceKeys.filter(key => key !== lruKey);
  const storedLru = storedValueMap.get(lruKey);

  if (storedLru == null && entryKeys.length > 0) {
    throw new CacheCorruptionError(`Missing ${namespace} LRU index`);
  }

  const lru = storedLru == null ? [] : parseJson(storedLru, `${namespace} LRU index`);
  if (
    !Array.isArray(lru) ||
    lru.some(key => typeof key !== 'string') ||
    new Set(lru).size !== lru.length ||
    (maxEntries != null && lru.length > maxEntries)
  ) {
    throw new CacheCorruptionError(`Invalid ${namespace} LRU index`);
  }

  const entries = {};
  const storage = {};
  for (const compositeKey of entryKeys) {
    const key = compositeKey.slice(prefix.length);
    if (key.length === 0 || key.includes(':')) {
      throw new CacheCorruptionError(`Invalid ${namespace} cache key`);
    }

    const entry = parseEntry(storedValueMap.get(compositeKey), key);
    if (validateValue != null) {
      let valid = false;
      try {
        valid = validateValue(entry.value, key);
      } catch (_) {
        valid = false;
      }

      if (!valid) {
        throw new CacheCorruptionError(`Invalid cache value ${key}`);
      }
    }

    entries[key] = entry;
    // This is the in-memory shape expected by Cache.peekItem/setItem.
    storage[compositeKey] = JSON.stringify(entry);
  }

  const entryNames = Object.keys(entries);
  if (
    entryNames.length !== lru.length ||
    entryNames.some(key => !lru.includes(key))
  ) {
    throw new CacheCorruptionError(`Inconsistent ${namespace} LRU index`);
  }

  return {entries, lru, storage};
};

export const clearCacheNamespace = async (cache, namespace) => {
  const prefix = namespacePrefixFor(namespace);
  const allKeys = await AsyncStorage.getAllKeys();
  const namespaceKeys = allKeys.filter(key => key.startsWith(prefix));

  if (namespaceKeys.length > 0) {
    await AsyncStorage.multiRemove(namespaceKeys);
  }

  await AsyncStorage.setItem(lruKeyFor(namespace), JSON.stringify([]));
  cache.lru = [];
  cache.storage = {};
};

const assignSnapshot = (cache, snapshot) => {
  cache.lru = snapshot.lru;
  cache.storage = snapshot.storage;
};

export const initializeCacheSafely = async (
  cache,
  namespace,
  maxEntries,
  validateValue,
) => {
  try {
    assignSnapshot(
      cache,
      await readCacheSnapshot(namespace, maxEntries, validateValue),
    );
  } catch (error) {
    if (!(error instanceof CacheCorruptionError)) throw error;
    await clearCacheNamespace(cache, namespace);
  }
};

export const getCacheEntriesSafely = async (
  cache,
  namespace,
  maxEntries,
  validateValue,
) => {
  try {
    const snapshot = await readCacheSnapshot(
      namespace,
      maxEntries,
      validateValue,
    );
    assignSnapshot(cache, snapshot);
    return snapshot.entries;
  } catch (error) {
    if (!(error instanceof CacheCorruptionError)) throw error;
    await clearCacheNamespace(cache, namespace);
    return {};
  }
};
