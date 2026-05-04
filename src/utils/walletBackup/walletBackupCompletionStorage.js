import AsyncStorage from '@react-native-async-storage/async-storage';
import {sha256} from '../crypto/hash';

const STORAGE_KEY = 'wallet_backup_request_completion_markers';
const COMPLETION_TTL_MS = 24 * 60 * 60 * 1000;

const loadMarkers = async () => {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);

  if (!stored) return {};

  try {
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
};

const saveMarkers = markers => {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(markers));
};

export const getWalletBackupCompletionKey = (
  request,
  detailIndex,
  accountHash,
) => {
  if (!request || accountHash == null) return null;

  const requestHash = sha256(request.toBuffer()).toString('hex');

  return sha256(
    Buffer.from(`${requestHash}:${detailIndex}:${accountHash}`, 'utf8'),
  ).toString('hex');
};

export const hasCompletedWalletBackupRequest = async completionKey => {
  if (!completionKey) return false;

  const markers = await loadMarkers();
  const now = Date.now();
  let changed = false;

  for (const key of Object.keys(markers)) {
    if (!markers[key] || markers[key] <= now) {
      delete markers[key];
      changed = true;
    }
  }

  if (changed) await saveMarkers(markers);

  return markers[completionKey] != null;
};

export const markWalletBackupRequestComplete = async completionKey => {
  if (!completionKey) return;

  const markers = await loadMarkers();
  const now = Date.now();

  for (const key of Object.keys(markers)) {
    if (!markers[key] || markers[key] <= now) delete markers[key];
  }

  markers[completionKey] = now + COMPLETION_TTL_MS;
  await saveMarkers(markers);
};
