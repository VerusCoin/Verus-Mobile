import {
  BigNumber as BN,
  Identity,
  I_ADDR_VERSION,
  R_ADDR_VERSION,
  SaplingPaymentAddress,
  fromBase58Check,
} from 'verus-typescript-primitives';

// CPrincipal::IsValid and CIdentity::IsValid in VerusCoin. The primitive
// serializer currently supports public-key hashes, not raw public keys.
export const MAX_IDENTITY_PRIMARY_ADDRESSES = 25;
export const MAX_IDENTITY_MINIMUM_SIGNATURES = 13;
const MAX_IDENTITY_BYTES = 6000 - 128;
const EDITABLE_FIELDS = new Set([
  'primaryaddresses', 'minimumsignatures', 'privateaddress',
  'recoveryauthority', 'revocationauthority',
]);
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const addressWithVersion = (input, version, message) => {
  if (typeof input !== 'string') throw new Error(message);
  const address = input.trim();
  try {
    const decoded = fromBase58Check(address);
    if (decoded.version !== version || decoded.hash.length !== 20 || decoded.hash.equals(Buffer.alloc(20))) {
      throw new Error(message);
    }
  } catch (_) {
    throw new Error(message);
  }
  return address;
};

export const validatePrimaryAddresses = addresses => {
  if (!Array.isArray(addresses) || addresses.length < 1 || addresses.length > MAX_IDENTITY_PRIMARY_ADDRESSES) {
    throw new Error(`Add between 1 and ${MAX_IDENTITY_PRIMARY_ADDRESSES} primary addresses.`);
  }
  const validated = addresses.map((address, index) => addressWithVersion(
    address, R_ADDR_VERSION,
    `Primary address ${index + 1} must be a valid transparent R-address.`,
  ));
  if (new Set(validated).size !== validated.length) {
    throw new Error('Each primary address must be different.');
  }
  return validated;
};

export const validateMinimumSignatures = (value, addressCount) => {
  const text = typeof value === 'string' ? value.trim() : value;
  const number = typeof text === 'number' ? text : typeof text === 'string' && /^\d+$/.test(text) ? Number(text) : NaN;
  const maximum = Math.min(addressCount, MAX_IDENTITY_MINIMUM_SIGNATURES);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) {
    throw new Error(`Required signatures must be a whole number from 1 to ${maximum}.`);
  }
  return number;
};

/** Resolve friendly authority names before calling this pure validator. */
export const validateIdentityAuthority = (value, label = 'Authority') => addressWithVersion(
  value, I_ADDR_VERSION, `${label} must be a valid identity address. Select an identity or enter its full name ending in @.`,
);

/** An empty value explicitly removes the published private address. */
export const validatePrivateAddress = value => {
  if (typeof value !== 'string') throw new Error('Enter a valid private zs-address, or leave it empty.');
  const address = value.trim();
  if (!address) return '';
  try {
    // The primitive decoder validates checksum/length but accepts arbitrary
    // Bech32 prefixes. Require the actual Sapling payment-address encoding.
    const parsed = SaplingPaymentAddress.fromAddressString(address);
    if (parsed.toAddressString() !== address.toLowerCase()) throw new Error('Invalid address prefix');
    return parsed.toAddressString();
  } catch (_) {
    throw new Error('Enter a valid private zs-address, or leave it empty.');
  }
};

const requireIdentity = identity => {
  if (!(identity instanceof Identity)) throw new Error('Load the current identity before making changes.');
  if (identity.isRevoked()) throw new Error('This identity is revoked. Recover it before changing its ownership or details.');
  return identity;
};

const cloneIdentity = identity => {
  requireIdentity(identity);
  const bytes = identity.toBuffer();
  const result = new Identity();
  const consumed = result.fromBuffer(bytes);
  if (consumed !== bytes.length || !result.toBuffer().equals(bytes)) {
    throw new Error('The current identity could not be copied safely.');
  }
  return result;
};

export const getIdentityEditFields = identity => {
  requireIdentity(identity);
  return {
    primaryaddresses: identity.primaryAddresses.map(address => address.toAddress()),
    minimumsignatures: identity.minSigs.toNumber(),
    privateaddress: identity.privateAddresses?.[0]?.toAddressString() || '',
    recoveryauthority: identity.recoveryAuthority.toAddress(),
    revocationauthority: identity.revocationAuthority.toAddress(),
  };
};

const finishUpdate = (original, updated) => {
  validatePrimaryAddresses(updated.primaryAddresses.map(address => address.toAddress()));
  validateMinimumSignatures(updated.minSigs.toNumber(), updated.primaryAddresses.length);
  validateIdentityAuthority(updated.recoveryAuthority.toAddress(), 'Recovery authority');
  validateIdentityAuthority(updated.revocationAuthority.toAddress(), 'Revocation authority');

  // CMM entries are transaction-local operations accumulated across history.
  // Omitting new entries retains history; copying them would replay old edits.
  updated.clearContentMultiMap();
  const before = cloneIdentity(original);
  before.clearContentMultiMap();
  const bytes = updated.toBuffer();
  if (bytes.equals(before.toBuffer())) throw new Error('Make a change before continuing.');
  if (bytes.length > MAX_IDENTITY_BYTES) throw new Error('These changes make the identity too large. Remove a primary address and try again.');
  return updated;
};

/**
 * Apply explicit form changes to an identity decoded from its real transaction.
 * Never reconstruct the base from getidentity JSON: that loses opaque content
 * and all but the first private address. Fields outside this form remain intact.
 */
export const buildModifiedIdentity = (identity, changes) => {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw new Error('Enter the identity changes to review.');
  for (const key of Object.keys(changes)) {
    if (!EDITABLE_FIELDS.has(key)) throw new Error(`This form cannot change ${key}.`);
  }

  const updated = cloneIdentity(identity);
  if (has(changes, 'primaryaddresses')) updated.setPrimaryAddresses(validatePrimaryAddresses(changes.primaryaddresses));
  if (has(changes, 'minimumsignatures')) {
    updated.minSigs = new BN(validateMinimumSignatures(changes.minimumsignatures, updated.primaryAddresses.length));
  }

  for (const [key, setter, label] of [
    ['recoveryauthority', 'setRecovery', 'Recovery authority'],
    ['revocationauthority', 'setRevocation', 'Revocation authority'],
  ]) {
    if (has(changes, key)) updated[setter](validateIdentityAuthority(changes[key], label));
  }

  if (has(changes, 'privateaddress')) {
    const address = validatePrivateAddress(changes.privateaddress);
    if (!address) updated.privateAddresses = [];
    else if (address !== updated.privateAddresses?.[0]?.toAddressString()) {
      // The form edits the published (first) address. Retain any additional
      // existing addresses, which the daemon's JSON representation omits.
      updated.privateAddresses = [
        SaplingPaymentAddress.fromAddressString(address),
        ...(updated.privateAddresses || []).slice(1),
      ];
    }
  }

  return finishUpdate(identity, updated);
};

/** Copy recipient controls and its published private address, with self authorities. */
export const buildTransferredIdentity = (identity, {address, targetIdentity} = {}) => {
  requireIdentity(identity);
  if (identity.hasTokenizedIdControl()) {
    throw new Error('This identity has a control token. Transferring its addresses cannot transfer the token’s recovery and revocation powers.');
  }

  const hasAddress = address !== undefined && address !== null;
  const hasTarget = targetIdentity !== undefined && targetIdentity !== null;
  if (hasAddress === hasTarget) throw new Error('Choose one recipient address or identity.');

  let primaryaddresses;
  let minimumsignatures;
  let privateaddress;
  if (hasTarget) {
    requireIdentity(targetIdentity);
    primaryaddresses = validatePrimaryAddresses(targetIdentity.primaryAddresses.map(primary => primary.toAddress()));
    minimumsignatures = validateMinimumSignatures(targetIdentity.minSigs.toNumber(), primaryaddresses.length);
    privateaddress = targetIdentity.privateAddresses?.[0]?.toAddressString();
  } else {
    primaryaddresses = validatePrimaryAddresses([address]);
    minimumsignatures = 1;
  }

  const authority = identity.getIdentityAddress();
  return buildModifiedIdentity(identity, {
    primaryaddresses,
    minimumsignatures,
    recoveryauthority: authority,
    revocationauthority: authority,
    ...(privateaddress ? {privateaddress} : {}),
  });
};
