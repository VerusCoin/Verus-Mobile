import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import crypto from 'react-native-quick-crypto';
import { Buffer } from 'buffer';
import { randomBytes } from './randomBytes';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;     // GCM standard
const SALT_LEN = 16;
const KEY_LEN = 32;    // 256-bit
const TAG_LEN = 16;
const PBKDF2_ITERS = 1000;

// Derive a key with PBKDF2-HMAC-SHA256
function deriveKey(passphrase, salt) {
  const key = pbkdf2(sha256, Buffer.from(passphrase, 'utf8'), salt, {
    c: PBKDF2_ITERS,
    dkLen: KEY_LEN,
  });

  return Buffer.from(key);
}

export async function saltedEncrypt(passphrase, data) {
  const salt = await randomBytes(SALT_LEN);
  const key = deriveKey(passphrase, salt);
  const iv = await randomBytes(IV_LEN);

  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const pt = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, ct, tag]).toString('base64');
}

export function saltedDecrypt(passphrase, b64) {
  const blob = Buffer.from(b64, 'base64');
  const salt = blob.subarray(0, SALT_LEN);
  const iv = blob.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const tag = blob.subarray(blob.length - TAG_LEN);
  const ct = blob.subarray(SALT_LEN + IV_LEN, blob.length - TAG_LEN);

  const key = deriveKey(passphrase, salt);

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  
  decipher.setAuthTag(tag);

  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}