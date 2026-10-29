import {
  BigNumber as BN, Identity, SaplingPaymentAddress, I_ADDR_VERSION, R_ADDR_VERSION,
  nameAndParentAddrToIAddr, toBase58Check,
} from 'verus-typescript-primitives';
import * as bech32 from 'bech32';
import {
  buildModifiedIdentity, buildTransferredIdentity, getIdentityEditFields,
  validateIdentityAuthority, validateMinimumSignatures, validatePrimaryAddresses,
  validatePrivateAddress,
} from '../../identityManagement/identityDefinition';

const SYSTEM = nameAndParentAddrToIAddr('VRSCTEST');
const ID = nameAndParentAddrToIAddr('owner', SYSTEM);
const RECOVERY = nameAndParentAddrToIAddr('recovery', SYSTEM);
const REVOCATION = nameAndParentAddrToIAddr('revocation', SYSTEM);
const rAddress = n => toBase58Check(Buffer.alloc(20, n), R_ADDR_VERSION);
const FIRST = rAddress(1);
const SECOND = rAddress(2);
const THIRD = rAddress(3);
const PRIVATE = 'zs1wczplx4kegw32h8g0f7xwl57p5tvnprwdmnzmdnsw50chcl26f7tws92wk2ap03ykaq6jyyztfa';
const OTHER_PRIVATE = 'zs1e0r2fuxpn6kymwa656trkwk8mpwzj03ucpw6kpvje5gjl6mgtjgdvafcgl54su2uclwgw6v24em';
const makeIdentity = (changes = {}) => Identity.fromJson({
  version: 3, name: 'owner', parent: SYSTEM, systemid: SYSTEM,
  flags: 3, timelock: 99,
  primaryaddresses: [FIRST, SECOND], minimumsignatures: 2,
  recoveryauthority: RECOVERY, revocationauthority: REVOCATION,
  privateaddress: PRIVATE,
  contentmap: {['11'.repeat(20)]: '22'.repeat(32)},
  contentmultimap: {[SYSTEM]: ['abc123', '000102']},
  ...changes,
});

describe('identity edit definitions', () => {
  it('extracts editable fields without exposing state or content as mutable form defaults', () => {
    const identity = makeIdentity();
    const original = identity.toBuffer();
    const fields = getIdentityEditFields(identity);
    expect(fields).toEqual({
      primaryaddresses: [FIRST, SECOND], minimumsignatures: 2,
      privateaddress: PRIVATE, recoveryauthority: RECOVERY, revocationauthority: REVOCATION,
    });
    fields.primaryaddresses.pop();
    expect(identity.toBuffer()).toEqual(original);
  });

  it('copies raw state and preserves opaque content, locks and private addresses without replaying old CMM operations', () => {
    const original = makeIdentity();
    original.privateAddresses.push(SaplingPaymentAddress.fromAddressString(OTHER_PRIVATE));
    const before = original.toBuffer();
    const result = buildModifiedIdentity(original, {primaryaddresses: [THIRD], minimumsignatures: ' 1 '});
    expect(result).not.toBe(original);
    expect(original.toBuffer()).toEqual(before);
    expect(result.primaryAddresses.map(address => address.toAddress())).toEqual([THIRD]);
    expect(result.minSigs.toNumber()).toBe(1);
    expect(result.contentMultiMap.kvContent.size).toBe(0);
    expect(original.contentMultiMap.kvContent.size).toBe(1);

    // Restore the two intentional changes and the transaction-local delta to
    // check every serialized byte, including fields this UI does not understand.
    result.setPrimaryAddresses([FIRST, SECOND]);
    result.minSigs = new BN(2);
    result.contentMultiMap = original.contentMultiMap;
    expect(result.toBuffer()).toEqual(before);
    result.contentMap.values().next().value[0] = 77;
    result.privateAddresses[1].pkD[0] = 66;
    expect(original.toBuffer()).toEqual(before);
  });

  it('does not remove additional private addresses when the form submits the unchanged first address', () => {
    const identity = makeIdentity();
    identity.privateAddresses.push(SaplingPaymentAddress.fromAddressString(OTHER_PRIVATE));
    const result = buildModifiedIdentity(identity, {...getIdentityEditFields(identity), minimumsignatures: '1'});
    expect(result.privateAddresses.map(address => address.toAddressString())).toEqual([PRIVATE, OTHER_PRIVATE]);
  });

  it('changes only the published private address and preserves other private addresses', () => {
    const identity = makeIdentity();
    identity.privateAddresses.push(SaplingPaymentAddress.fromAddressString(PRIVATE));
    const result = buildModifiedIdentity(identity, {privateaddress: OTHER_PRIVATE});
    expect(result.privateAddresses.map(address => address.toAddressString())).toEqual([OTHER_PRIVATE, PRIVATE]);
    expect(identity.privateAddresses.map(address => address.toAddressString())).toEqual([PRIVATE, PRIVATE]);
  });

  it('explicitly removes private addresses without giving an empty string to the primitive decoder', () => {
    const identity = makeIdentity();
    const result = buildModifiedIdentity(identity, {privateaddress: '  '});
    expect(result.privateAddresses).toEqual([]);
    expect(identity.privateAddresses[0].toAddressString()).toBe(PRIVATE);
    expect(result.toBuffer().length).toBeGreaterThan(0);
  });

  it('accepts self recovery and revocation authorities', () => {
    const result = buildModifiedIdentity(makeIdentity(), {recoveryauthority: ID, revocationauthority: ID});
    expect(result.recoveryAuthority.toAddress()).toBe(ID);
    expect(result.revocationAuthority.toAddress()).toBe(ID);
  });

  it.each(['name', 'parent', 'systemid', 'flags', 'timelock', 'contentmap', 'contentmultimap', 'version'])('rejects accidental changes to %s', key => {
    expect(() => buildModifiedIdentity(makeIdentity(), {[key]: 0})).toThrow(`cannot change ${key}`);
  });

  it.each([{}, {primaryaddresses: [FIRST, SECOND], minimumsignatures: 2}, {privateaddress: PRIVATE}])('rejects unchanged forms without treating historical CMM as a new edit: %p', changes => {
    expect(() => buildModifiedIdentity(makeIdentity(), changes)).toThrow('Make a change');
  });

  it('does not silently reduce a signature threshold when removing a signer', () => {
    expect(() => buildModifiedIdentity(makeIdentity(), {primaryaddresses: [FIRST]})).toThrow('Required signatures');
  });

  it('rejects identity definitions too large for the daemon output limit', () => {
    const identity = makeIdentity();
    for (let i = 1; i <= 120; i++) identity.contentMap.set(nameAndParentAddrToIAddr(`content${i}`, SYSTEM), Buffer.alloc(32, i));
    expect(() => buildModifiedIdentity(identity, {minimumsignatures: 1})).toThrow('too large');
  });

  it('requires a raw-derived Identity object and refuses normal edits to revoked identities', () => {
    expect(() => buildModifiedIdentity(makeIdentity().toJson(), {minimumsignatures: 1})).toThrow('Load the current identity');
    expect(() => buildModifiedIdentity(makeIdentity({flags: 0x8000}), {minimumsignatures: 1})).toThrow('revoked');
  });
});

describe('identity transfer definitions', () => {
  it('transfers to one transparent address with exactly one required signature', () => {
    const identity = makeIdentity();
    const result = buildTransferredIdentity(identity, {address: ` ${THIRD} `});
    expect(getIdentityEditFields(result)).toEqual({
      ...getIdentityEditFields(identity), primaryaddresses: [THIRD], minimumsignatures: 1,
      recoveryauthority: ID, revocationauthority: ID,
    });
    expect(result.getIdentityAddress()).toBe(identity.getIdentityAddress());
    expect(result.flags.toNumber()).toBe(3);
    expect(result.unlockAfter.toNumber()).toBe(99);
  });

  it('copies the recipient signing policy, resets external authorities to self, and preserves other fields', () => {
    const identity = makeIdentity();
    const recipient = makeIdentity({
      name: 'recipient', parent: RECOVERY, flags: 0, timelock: 0,
      primaryaddresses: [rAddress(7), rAddress(5), rAddress(4)], minimumsignatures: 2,
      recoveryauthority: ID, revocationauthority: ID, privateaddress: OTHER_PRIVATE,
      contentmap: {}, contentmultimap: {},
    });
    const before = identity.toBuffer();
    const recipientBefore = recipient.toBuffer();
    const result = buildTransferredIdentity(identity, {targetIdentity: recipient});
    expect(result.primaryAddresses.map(address => address.toAddress())).toEqual([rAddress(7), rAddress(5), rAddress(4)]);
    expect(result.minSigs.toNumber()).toBe(2);
    expect(result.recoveryAuthority.toAddress()).toBe(ID);
    expect(result.revocationAuthority.toAddress()).toBe(ID);
    expect(result.privateAddresses[0].toAddressString()).toBe(PRIVATE);
    expect(result.contentMultiMap.kvContent.size).toBe(0);
    result.setPrimaryAddresses([FIRST, SECOND]);
    result.setRecovery(RECOVERY);
    result.setRevocation(REVOCATION);
    result.contentMultiMap = identity.contentMultiMap;
    expect(result.toBuffer()).toEqual(before);
    expect(identity.toBuffer()).toEqual(before);
    expect(recipient.toBuffer()).toEqual(recipientBefore);
  });

  it.each([{}, {address: THIRD, targetIdentity: makeIdentity()}])('requires exactly one destination: %p', recipient => {
    expect(() => buildTransferredIdentity(makeIdentity(), recipient)).toThrow('Choose one recipient');
  });

  it('does not silently repair a destination identity with duplicate controlling addresses', () => {
    expect(() => buildTransferredIdentity(makeIdentity(), {targetIdentity: makeIdentity({primaryaddresses: [THIRD, THIRD]})})).toThrow('must be different');
  });

  it('allows resetting external authorities when the recipient signing policy is unchanged', () => {
    const result = buildTransferredIdentity(makeIdentity(), {targetIdentity: makeIdentity()});
    expect(result.recoveryAuthority.toAddress()).toBe(ID);
    expect(result.revocationAuthority.toAddress()).toBe(ID);
  });

  it('refuses transfers that would leave recovery and revocation with the control-token holder', () => {
    const identity = makeIdentity({flags: 7});
    expect(() => buildTransferredIdentity(identity, {address: THIRD})).toThrow('control token');
    expect(buildModifiedIdentity(identity, {minimumsignatures: 1}).hasTokenizedIdControl()).toBe(true);
  });

  it('refuses revoked destinations and wholly unchanged transfers', () => {
    expect(() => buildTransferredIdentity(makeIdentity(), {targetIdentity: makeIdentity({flags: 0x8000})})).toThrow('revoked');
    const identity = makeIdentity({recoveryauthority: ID, revocationauthority: ID});
    expect(() => buildTransferredIdentity(identity, {targetIdentity: makeIdentity()})).toThrow('Make a change');
  });
});

describe('identity form validation', () => {
  it('allows the daemon’s maximum 25 controllers and 13 signatures', () => {
    const addresses = Array.from({length: 25}, (_, i) => rAddress(i + 1));
    expect(validatePrimaryAddresses(addresses)).toEqual(addresses);
    expect(validateMinimumSignatures('13', addresses.length)).toBe(13);
    expect(() => validatePrimaryAddresses([...addresses, rAddress(26)])).toThrow('between 1 and 25');
    expect(() => validateMinimumSignatures(14, addresses.length)).toThrow('1 to 13');
  });

  it.each([[], null, 'address'])('rejects malformed or empty primary-address lists: %p', addresses => {
    expect(() => validatePrimaryAddresses(addresses)).toThrow('between 1 and 25');
  });

  it.each([ID, 'satoshi@', PRIVATE, 'invalid', toBase58Check(Buffer.alloc(20, 9), 85), toBase58Check(Buffer.alloc(20), R_ADDR_VERSION), null])('rejects non-R primary addresses before lossy primitive conversion: %p', address => {
    expect(() => validatePrimaryAddresses([address])).toThrow('valid transparent R-address');
  });

  it('detects duplicate signers after trimming whitespace', () => {
    expect(() => validatePrimaryAddresses([FIRST, ` ${FIRST} `])).toThrow('must be different');
  });

  it.each([0, -1, 1.5, NaN, Infinity, '1e0', '1.0', '1x', '', null, true, {}, 3])('rejects invalid or unreachable signature thresholds: %p', count => {
    expect(() => validateMinimumSignatures(count, 2)).toThrow('whole number from 1 to 2');
  });

  it.each([FIRST, 'satoshi', 'satoshi@', '', toBase58Check(Buffer.alloc(20), I_ADDR_VERSION)])('requires resolved, nonzero identity authorities: %p', authority => {
    expect(() => validateIdentityAuthority(authority)).toThrow('valid identity address');
  });

  it('validates private-address checksum, byte length and prefix', () => {
    expect(validatePrivateAddress(` ${PRIVATE} `)).toBe(PRIVATE);
    expect(validatePrivateAddress(PRIVATE.toUpperCase())).toBe(PRIVATE);
    expect(validatePrivateAddress('')).toBe('');
    const words = bech32.decode(PRIVATE, 1000).words;
    const wrongPrefix = bech32.encode('xx', words);
    for (const value of [FIRST, `${PRIVATE.slice(0, -1)}q`, wrongPrefix, bech32.encode('zs', [1, 2], 1000), null]) {
      expect(() => validatePrivateAddress(value)).toThrow('valid private zs-address');
    }
  });
});
