import {Buffer} from 'buffer';
import {fromBase58Check, I_ADDR_VERSION, R_ADDR_VERSION} from 'verus-typescript-primitives';
import QrScanner from '../QrScanner/QrScanner';

const isRecipient = recipient => {
  try {
    const decoded = fromBase58Check(recipient);
    if ([R_ADDR_VERSION, I_ADDR_VERSION].includes(decoded.version) && decoded.hash.length === 20 && !decoded.hash.equals(Buffer.alloc(20))) return true;
  } catch (_) {}
  return recipient.length <= 256 && /^[^@:/?#\u0000-\u001f\u007f]+@$/u.test(recipient);
};

// Read receiving QR codes without invoking VerusPay's payment/deeplink actions.
// A scan fills a form; it never looks up, approves, signs, or sends an update.
export const recipientFromQr = (raw, systemId) => {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 8192) {
    throw new Error('Scan a receiving address or a VerusID QR code.');
  }

  // Plain identity names can be longer than the payment parser's address-only
  // limit and may contain spaces. Network lookup still validates them later.
  if (isRecipient(raw.trim())) return raw.trim();

  let request;
  try {
    request = QrScanner.processGenericPaymentRequest(raw.trim());
  } catch (_) {
    throw new Error('This QR code does not contain a supported receiving address.');
  }
  if (!request || typeof request !== 'object') throw new Error('This QR code does not contain a supported receiving address.');

  const network = request.system || request.coinObj?.system_id;
  if (network && network !== systemId) throw new Error('This QR code is for a different network. Use an address on this identity’s network.');

  const recipient = typeof request.address === 'string' ? request.address.trim() : '';
  if (isRecipient(recipient)) return recipient;
  throw new Error('Scan a transparent R-address or a VerusID name ending in @. Private receiving addresses cannot control an identity.');
};
