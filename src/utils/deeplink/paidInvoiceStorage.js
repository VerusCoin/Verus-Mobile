import AsyncStorage from '@react-native-async-storage/async-storage';
import {sha256} from '../crypto/hash';

// Invoices this device paid, so a second visit can say so. The record lives
// on this device only; paying again stays possible.
const STORAGE_KEY = 'paid_invoice_markers';
const MAX_MARKERS = 200;

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

/**
 * One invoice as one account sees it. A GenericRequest has its own ID and
 * time in the request bytes; a legacy invoice link has only its details and
 * signature time.
 */
export const getPaidInvoiceKey = ({
  request,
  detailIndex,
  detailsBufferString,
  sigtime,
  accountHash,
}) => {
  if (accountHash == null) return null;

  const source = request
    ? `${sha256(request.toBuffer()).toString('hex')}:${detailIndex}`
    : detailsBufferString
      ? `${detailsBufferString}:${sigtime ?? ''}`
      : null;

  if (!source) return null;

  return sha256(Buffer.from(`${source}:${accountHash}`, 'utf8')).toString('hex');
};

/** @returns {Promise<{txid: string|null, paidAt: number}|null>} */
export const loadPaidInvoice = async key => {
  if (!key) return null;

  const markers = await loadMarkers();
  return markers[key] || null;
};

/**
 * A null txid means the broadcast status is unknown: the invoice may be paid.
 */
export const savePaidInvoice = async (key, txid) => {
  if (!key) return;

  const markers = await loadMarkers();
  markers[key] = {txid: txid || null, paidAt: Date.now()};

  const oldestFirst = Object.keys(markers).sort(
    (a, b) => (markers[a]?.paidAt || 0) - (markers[b]?.paidAt || 0),
  );
  while (oldestFirst.length > MAX_MARKERS) delete markers[oldestFirst.shift()];

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(markers));
};
