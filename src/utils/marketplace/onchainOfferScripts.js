import BN from 'bn.js';
import {
  KeyID,
  OPS,
  OptCCParams,
  TxDestination,
  SmartTransactionScript,
  Identity,
  IdentityScript,
  compile,
  fromBase58Check,
  getDataKey,
} from 'verus-typescript-primitives';
import { hash, hash160 } from 'verus-typescript-primitives/dist/utils/hash.js';

// VDXF offer index-key names (crosschainrpc.h). The daemon indexes an identity
// offer under two keys: what's offered (the identity) and what's wanted (currency).
export const IDENTITY_OFFER_BASE_KEY = getDataKey(
  'vrsc::system.exchange.identityoffer',
).id;
export const OFFER_FOR_CURRENCY_BASE_KEY = getDataKey(
  'vrsc::system.exchange.offerforcurrency',
).id;

function hash160FromAddressOrBuffer(value) {
  const bytes = Buffer.isBuffer(value) ? Buffer.from(value) : fromBase58Check(value).hash;
  if (bytes.length !== 20) {
    throw new Error(`Expected a 20-byte hash160 value, got ${bytes.length} bytes`);
  }
  return bytes;
}

function keyDestination(hash160Value) {
  return new TxDestination(new KeyID(hash160FromAddressOrBuffer(hash160Value)));
}

// GetConditionID(signatureKey, condition) = Hash160(SHA256D(condition || signatureKey)).
export function deriveOfferIndexKey(baseKey, condition) {
  return hash160(hash(hash160FromAddressOrBuffer(condition), hash160FromAddressOrBuffer(baseKey)));
}

/**
 * Native identity-offer output scriptPubKey (byte-identical to the daemon's
 * makeoffer). Master: OptCCParams(v3, EVAL_NONE, m=1, n=3) whose destinations
 * are the two offer index keys; params: the identity's own CC params. Spending
 * the offered identity's outpoint into this output LOCKS the identity into an
 * on-chain offer that `getoffers` indexes natively — no deposit, no OP_RETURN.
 */
export function buildIdentityOfferOutputScript(identityJson, offeredIdentityIAddr, forCurrencyIAddr) {
  const master = new OptCCParams({
    version: new BN(3),
    evalCode: new BN(0), // EVAL_NONE
    m: new BN(1),
    n: new BN(3),
    destinations: [
      keyDestination(deriveOfferIndexKey(OFFER_FOR_CURRENCY_BASE_KEY, forCurrencyIAddr)),
      keyDestination(deriveOfferIndexKey(IDENTITY_OFFER_BASE_KEY, offeredIdentityIAddr)),
    ],
    vData: [],
  });
  const idScript = IdentityScript.fromIdentity(Identity.fromJson(identityJson));
  return new SmartTransactionScript(master, idScript.paramsOptCC).toBuffer();
}

// Serialized offer object stored in the opret tx's OP_RETURN so `getoffers`
// reports the price + takeable partial. Structure (reverse-engineered + proven
// against the daemon): 18-byte header + varint(len) + the signed partial tx
// (spends the offer output -> pays the seller, SIGHASH_SINGLE|ANYONECANPAY) +
// 4-byte suffix. The header/suffix are static; every dynamic field lives inside
// the partial.
const OFFER_OPRET_HEADER = Buffer.from('0500000003000201000000000100000000', 'hex');
const OFFER_OPRET_SUFFIX = Buffer.from('00000000', 'hex');

export function buildOfferOpret(signedPartialHex) {
  const partial = Buffer.from(signedPartialHex, 'hex');
  if (partial.length >= 0xfd) {
    throw new Error(`Offer partial too long (${partial.length}) for single-byte length prefix`);
  }
  return Buffer.concat([
    OFFER_OPRET_HEADER,
    Buffer.from([partial.length]),
    partial,
    OFFER_OPRET_SUFFIX,
  ]);
}

export function buildOfferOpReturnScript(dataBuffer) {
  return compile([OPS.OP_RETURN, Buffer.from(dataBuffer)]);
}
