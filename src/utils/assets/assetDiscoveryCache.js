import AsyncStorage from '@react-native-async-storage/async-storage';

// Found-asset snapshots and resolved currency data are a cache of chain reads.
// They stay out of the asset choices, so a choice write
// stays small. The VRPC response cache keeps the same address balances and
// currency definitions in AsyncStorage.
const KEY_PREFIX = 'assetDiscoveryCache:v1:';
const cacheKey = (accountHash, networkKey) =>
  `${KEY_PREFIX}${accountHash}:${networkKey}`;

export const loadAssetDiscoveryCache = async (accountHash, networkKey) => {
  try {
    const cache = JSON.parse(await AsyncStorage.getItem(cacheKey(accountHash, networkKey)));
    return cache != null && typeof cache === 'object' ? cache : null;
  } catch (_) {
    // An unreadable cache is the same as no cache: discovery builds it again.
    return null;
  }
};

export const saveAssetDiscoveryCache = (accountHash, networkKey, {snapshots, resolved}) =>
  AsyncStorage.setItem(
    cacheKey(accountHash, networkKey),
    JSON.stringify({snapshots: snapshots || {}, resolved: resolved || {}}),
  );

export const deleteAssetDiscoveryCache = async accountHash => {
  const keys = (await AsyncStorage.getAllKeys())
    .filter(key => key.startsWith(`${KEY_PREFIX}${accountHash}:`));
  if (keys.length > 0) await AsyncStorage.multiRemove(keys);
};
