import AsyncStorage from '@react-native-async-storage/async-storage';

const choicesKey = accountHash => `assetChoices:v1:${accountHash}`;
const queues = new Map();
const isRecord = value => value != null && typeof value === 'object' && !Array.isArray(value);

export const validateAssetChoices = (saved, legacy = false) => {
  if (saved?.version != null && saved.version !== 1) {
    const error = new Error('Asset preferences version unavailable');
    error.code = 'ASSET_CHOICES_VERSION';
    throw error;
  }
  if (!isRecord(saved) || (!legacy && saved.version !== 1) ||
      (!isRecord(saved.networks) && !(legacy && saved.networks == null)) ||
      Object.values(saved.networks || {}).some(network => !isRecord(network) ||
        ['preferences', 'removed', 'reviewed'].some(key =>
          network[key] != null && !isRecord(network[key])))) {
    throw new Error('Unable to read asset preferences');
  }
  return saved;
};

// Hydration/migration, read-modify-write, and deletion share one profile queue.
export const queueAssetChoicesWrite = (accountHash, operation) => {
  const queued = (queues.get(accountHash) || Promise.resolve()).then(operation, operation);
  const settled = queued.catch(() => {});
  queues.set(accountHash, settled);
  settled.then(() => {
    if (queues.get(accountHash) === settled) queues.delete(accountHash);
  });
  return queued;
};

export const loadAssetChoices = async accountHash => {
  const raw = await AsyncStorage.getItem(choicesKey(accountHash));
  // Only an absent key is missing. Invalid JSON, null and invalid shapes fail.
  return raw === null ? null : validateAssetChoices(JSON.parse(raw));
};

export const saveAssetChoices = (accountHash, saved) =>
  AsyncStorage.setItem(choicesKey(accountHash), JSON.stringify(validateAssetChoices(saved)));

// Profiles created in this session. The first hydration of one skips the
// storage reads; later ones read storage as usual.
const newProfiles = new Set();
export const markNewAssetChoices = accountHash => newProfiles.add(accountHash);
export const takeNewAssetChoices = accountHash => newProfiles.delete(accountHash);

export const deleteAssetChoices = accountHash =>
  queueAssetChoicesWrite(accountHash, () => AsyncStorage.removeItem(choicesKey(accountHash)));
