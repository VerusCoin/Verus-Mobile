let mockState;
const mockListeners = new Set();
const mockEncrypt = jest.fn();
const mockDecrypt = jest.fn();
const mockKeys = jest.fn();
const mockMnemonic = jest.fn();
const mockMaterial = jest.fn();
const mockRandom = jest.fn();
jest.mock('../../../store', () => ({
  getState: () => mockState,
  subscribe: listener => { mockListeners.add(listener); return () => mockListeners.delete(listener); },
}));
jest.mock('react-native-verus', () => ({Tools: {encryptVerusData: mockEncrypt, decryptVerusData: mockDecrypt}}));
jest.mock('../../api/channels/dlight/requests/zGetEncryptionAddress', () => ({zGetEncryptionAddress: mockKeys}));
jest.mock('../../crypto/getKeyMaterial', () => ({getKeyMaterial: mockMaterial}));
jest.mock('../../keyGenerator/keyGenerator', () => ({getKey: mockMnemonic}));
jest.mock('../../crypto/randomBytes', () => ({randomBytes: mockRandom}));

const {createCipheriv, createDecipheriv, createHash, randomBytes} = require('crypto');
const {Transaction, networks, smarttxs} = require('@bitgo/utxo-lib');
const {
  DataDescriptor, DataDescriptorKey, DataStringKey, DataByteVectorKey, Identity, IdentityUpdateRequestDetails,
  DATA_TYPE_VDXFDATA, FqnVdxfUniValue, VdxfUniValue,
  SaplingPaymentAddress, VDXFDataDescriptor, nameAndParentAddrToIAddr,
} = require('verus-typescript-primitives');
const {VerusIdInterface, verifyIdentityUpdateData} = require('verusid-ts-client');
const {createLocalIdentityUploadCrypto} = require('../../identityUpdate/localUploadCrypto');

const SYSTEM = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const PRIVATE = 'zs1e0r2fuxpn6kymwa656trkwk8mpwzj03ucpw6kpvje5gjl6mgtjgdvafcgl54su2uclwgw6v24em';
const PUBLIC = 'zs1h0exdrt2lemtxh6866shf2ezagaqex9kqdcseulmy3c52esxmq55lrly886qftcp2t2k7ffa6xq';
const WRAPPER = new VDXFDataDescriptor(new DataDescriptor({objectdata: Buffer.from('requested upload')}),
  DataDescriptorKey.vdxfid).toBuffer();
const request = (groups = [{}]) => IdentityUpdateRequestDetails.fromCLIJson({
  name: 'upload-test', parent: SYSTEM,
  contentmultimap: Object.fromEntries(groups.map((group, i) => [
    i ? nameAndParentAddrToIAddr(`upload-${i}`, SYSTEM) : DataStringKey.vdxfid,
    {data: {createmmr: true, message: 'requested upload', ...group}},
  ])),
});
const build = (details = request(), options = {}) => createLocalIdentityUploadCrypto({
  systemId: SYSTEM, request: details, ...options,
});
const descriptor = (encrypted, ivk) => new DataDescriptor({
  flags: DataDescriptor.FLAG_ENCRYPTED_DATA, epk: encrypted.epk,
  objectdata: encrypted.ciphertext, ...(ivk ? {ivk} : {}),
});
const context = recipient => ({contentKey: DataStringKey.vdxfid, encryptToAddress: recipient});
let encryptionKeys;
let recipientKeys;
beforeEach(() => {
  jest.clearAllMocks();
  mockListeners.clear();
  mockState = {authentication: {activeAccount: {accountHash: 'account'}, sessionEpoch: 1}};
  encryptionKeys = new Map();
  recipientKeys = new Map();
  mockRandom.mockImplementation(async length => randomBytes(length));
  mockMnemonic.mockImplementation(async () => 'synthetic fresh mnemonic');
  mockMaterial.mockResolvedValue({extsk: 'wallet-secret'});
  let recipients = 0;
  mockKeys.mockImplementation(async () => {
    const address = SaplingPaymentAddress.fromAddressString(PUBLIC);
    address.d = Buffer.alloc(11, ++recipients);
    const encoded = address.toAddressString();
    const ivk = createHash('sha256').update(`ivk-${recipients}`).digest('hex');
    recipientKeys.set(encoded, ivk);
    return {address: encoded, ivk, extfvk: 'must-not-be-retained'};
  });
  mockEncrypt.mockImplementation(async (address, plaintextHex, returnSsk) => {
    const epk = randomBytes(32);
    const key = randomBytes(32);
    const cipher = createCipheriv('chacha20-poly1305', key, Buffer.alloc(12), {authTagLength: 16});
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintextHex, 'hex')), cipher.final(), cipher.getAuthTag()]);
    encryptionKeys.set(epk.toString('hex'), {key, ivk: recipientKeys.get(address)});
    return {ephemeralPublicKey: epk.toString('hex'), encryptedData: ciphertext.toString('hex'),
      ...(returnSsk ? {symmetricKey: key.toString('hex')} : {})};
  });
  // This is actual authenticated ChaCha20-Poly1305, replacing just native
  // Sapling key agreement. No plaintext lookup can conceal authentication bugs.
  mockDecrypt.mockImplementation(async (ivk, epk, ciphertextHex, ssk) => {
    const record = encryptionKeys.get(epk);
    if (!ssk && (!ivk || record?.ivk !== ivk)) throw new Error('Authentication failed');
    const key = ssk ? Buffer.from(ssk, 'hex') : record.key;
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const decipher = createDecipheriv('chacha20-poly1305', key, Buffer.alloc(12), {authTagLength: 16});
    decipher.setAuthTag(ciphertext.subarray(-16));
    return Buffer.concat([decipher.update(ciphertext.subarray(0, -16)), decipher.final()]).toString('hex');
  });
});

afterEach(() => {
  mockState.authentication.sessionEpoch++;
  [...mockListeners].forEach(listener => listener());
  expect(mockListeners.size).toBe(0);
});

it('derives disposable public recipients using fresh mnemonic words and authenticates tagged bytes', async () => {
  const crypto = await build();
  const recipient = await crypto.createPublicRecipient();
  const other = await crypto.createPublicRecipient();
  expect(other.address).not.toBe(recipient.address);
  expect(other.ivk.equals(recipient.ivk)).toBe(false);
  expect(mockMnemonic).toHaveBeenNthCalledWith(1, 256);
  expect(mockMnemonic).toHaveBeenCalledTimes(2);
  expect(mockKeys).toHaveBeenCalledWith(SYSTEM, {mnemonicSeed: 'synthetic fresh mnemonic', returnSecret: false});
  expect(Object.keys(recipient).sort()).toEqual(['address', 'ivk']);
  const encrypted = await crypto.encrypt(WRAPPER, recipient.address);
  expect(mockEncrypt).toHaveBeenCalledWith(recipient.address, WRAPPER.toString('hex'), false);
  expect(await crypto.decryptData(descriptor(encrypted, recipient.ivk), context())).toEqual(WRAPPER);
  expect(mockMaterial).not.toHaveBeenCalled();
  expect(mockDecrypt).toHaveBeenCalledTimes(1);
  crypto.dispose();
  expect(mockListeners.size).toBe(0);
});

it('authenticates external private recipients with an operation-local SSK, never exposing it', async () => {
  const crypto = await build(request([{encrypttoaddress: PRIVATE}]));
  const encrypted = await crypto.encrypt(WRAPPER, PRIVATE);
  expect(Object.keys(encrypted).sort()).toEqual(['ciphertext', 'epk']);
  expect(mockEncrypt).toHaveBeenCalledWith(PRIVATE, WRAPPER.toString('hex'), true);
  const encryptedDescriptor = descriptor(encrypted);
  expect(await crypto.decryptData(encryptedDescriptor, context(PRIVATE))).toEqual(WRAPPER);
  expect(await crypto.decryptData(encryptedDescriptor, context(PRIVATE))).toEqual(WRAPPER);
  expect(mockDecrypt).toHaveBeenCalledTimes(2);
  expect(mockDecrypt.mock.calls[0][0]).toBeNull();
  expect(mockDecrypt.mock.calls[0][3]).toHaveLength(64);
  expect(mockKeys).not.toHaveBeenCalled();
  expect(mockMaterial).not.toHaveBeenCalled();
  crypto.dispose();
  await expect(crypto.decryptData(encryptedDescriptor, context(PRIVATE))).rejects.toThrow('disposed');
  expect(mockDecrypt).toHaveBeenCalledTimes(2);
});

it.each(['ciphertext', 'epk', 'recipient', 'contentKey', 'ivk', 'ssk'])('rejects changed private %s before native decryption', async field => {
  const crypto = await build(request([{encrypttoaddress: PRIVATE}]));
  const encrypted = await crypto.encrypt(WRAPPER, PRIVATE);
  const outer = descriptor(encrypted);
  const ctx = context(PRIVATE);
  if (field === 'recipient') ctx.encryptToAddress = PUBLIC;
  else if (field === 'contentKey') ctx.contentKey = SYSTEM;
  else if (field === 'ciphertext') outer.objectdata[0] ^= 1;
  else if (field === 'epk') outer.epk[0] ^= 1;
  else outer[field] = Buffer.alloc(32, 1);
  await expect(crypto.decryptData(outer, ctx)).rejects.toThrow();
  expect(mockDecrypt).not.toHaveBeenCalled();
  expect(mockListeners.size).toBe(0);
});

it('does not accept arbitrary authenticated bytes as a descriptor wrapper', async () => {
  const crypto = await build(request([{encrypttoaddress: PRIVATE}]));
  const encrypted = await crypto.encrypt(Buffer.from('not a tagged descriptor'), PRIVATE);
  await expect(crypto.decryptData(descriptor(encrypted), context(PRIVATE))).rejects.toThrow();
  expect(mockDecrypt).toHaveBeenCalledTimes(1);
});

it.each(['ephemeralPublicKey', 'encryptedData', 'symmetricKey'])('rejects malformed native %s', async field => {
  const original = mockEncrypt.getMockImplementation();
  mockEncrypt.mockImplementation(async (...args) => ({...await original(...args), [field]: '00zz'}));
  const crypto = await build(request([{encrypttoaddress: PRIVATE}]));
  await expect(crypto.encrypt(WRAPPER, PRIVATE)).rejects.toThrow('native identity upload crypto response');
  expect(mockListeners.size).toBe(0);
});

it('requires fresh native EPKs for every encrypted descriptor', async () => {
  const result = await mockEncrypt(PRIVATE, WRAPPER.toString('hex'), true);
  mockEncrypt.mockImplementation(async () => ({...result}));
  const crypto = await build(request([{encrypttoaddress: PRIVATE}]));
  await crypto.encrypt(WRAPPER, PRIVATE);
  await expect(crypto.encrypt(WRAPPER, PRIVATE)).rejects.toThrow('ephemeral key was reused');
});

it('rejects native authentication failures without returning remembered plaintext', async () => {
  const crypto = await build(request([{encrypttoaddress: PRIVATE}]));
  const encrypted = await crypto.encrypt(WRAPPER, PRIVATE);
  mockDecrypt.mockRejectedValue(new Error('Native authentication failed'));
  await expect(crypto.decryptData(descriptor(encrypted), context(PRIVATE))).rejects.toThrow('Native authentication failed');
  expect(mockListeners.size).toBe(0);
});

it('rejects public IVKs that were not generated by this operation', async () => {
  const crypto = await build();
  const recipient = await crypto.createPublicRecipient();
  const encrypted = await crypto.encrypt(WRAPPER, recipient.address);
  await expect(crypto.decryptData(descriptor(encrypted, Buffer.alloc(32, 3)), context())).rejects.toThrow('Unknown disposable');
  expect(mockDecrypt).not.toHaveBeenCalled();
});

it('rejects oversized encryption before calling native code', async () => {
  const crypto = await build(request([{encrypttoaddress: PRIVATE}]));
  await expect(crypto.encrypt(Buffer.alloc(2000000), PRIVATE)).rejects.toThrow('operation limit');
  expect(mockEncrypt).not.toHaveBeenCalled();
});

it('disposes immediately when the account changes while idle', async () => {
  const crypto = await build(request([{encrypttoaddress: PRIVATE}]));
  const encrypted = await crypto.encrypt(WRAPPER, PRIVATE);
  mockState.authentication.sessionEpoch++;
  [...mockListeners].forEach(listener => listener());
  expect(mockListeners.size).toBe(0);
  await expect(crypto.decryptData(descriptor(encrypted), context(PRIVATE))).rejects.toMatchObject({code: 'SESSION_CHANGED'});
  expect(mockDecrypt).not.toHaveBeenCalled();
});

it.each(['random', 'recipient', 'encrypt', 'decrypt'])('checks cancellation after native %s awaits', async stage => {
  let active = true;
  const crypto = await build(request([{encrypttoaddress: PRIVATE}]), {assertActive: () => {
    if (!active) throw new Error('Cancelled upload');
  }});
  let run;
  const cancelAfter = mock => {
    const original = mock.getMockImplementation();
    mock.mockImplementation(async (...args) => { const result = await original(...args); active = false; return result; });
  };
  if (stage === 'random') { cancelAfter(mockRandom); run = () => crypto.randomBytes(32); }
  else if (stage === 'recipient') { cancelAfter(mockKeys); run = () => crypto.createPublicRecipient(); }
  else if (stage === 'encrypt') { cancelAfter(mockEncrypt); run = () => crypto.encrypt(WRAPPER, PRIVATE); }
  else {
    const encrypted = await crypto.encrypt(WRAPPER, PRIVATE);
    cancelAfter(mockDecrypt);
    run = () => crypto.decryptData(descriptor(encrypted), context(PRIVATE));
  }
  await expect(run()).rejects.toThrow('Cancelled upload');
  expect(mockListeners.size).toBe(0);
});

// Exercise the public SDK builder with the Mobile crypto adapter and real
// primitives, including all leaves/root/hash-vector verification and multipart.
const sourceIdentity = Identity.fromJson({version: 3, flags: 0, name: 'upload-test', parent: SYSTEM, systemid: SYSTEM,
  primaryaddresses: ['RP1j8ziHUzgs6THJiAQa2BiqjRLLCWQxAk'], minimumsignatures: 1,
  recoveryauthority: SYSTEM, revocationauthority: SYSTEM, contentmap: {}, contentmultimap: {}, timelock: 0});
const source = Transaction.fromHex(smarttxs.createUnfundedIdentityUpdate(
  sourceIdentity.toBuffer().toString('hex'), networks.verus, 30020), networks.verus);
source.addInput(Buffer.alloc(32, 9), 0);
const prepare = async (details, crypto) => {
  const sdk = new VerusIdInterface('VRSCTEST', 'http://unused.invalid');
  sdk.interface = new Proxy({}, {get: () => () => { throw new Error('No RPC allowed while constructing upload'); }});
  return sdk.createUpdateIdentityTransaction(details, sourceIdentity.primaryAddresses[0].toAddress(),
    source.toHex(), 100, undefined, SYSTEM, undefined, undefined, 30000, undefined,
    false, true, false, crypto.decryptData, crypto);
};

it.each([
  ['public single', [{}], 2],
  ['private single', [{encrypttoaddress: PRIVATE}], 2],
  ['public MMR', [{message: undefined, mmrdata: [{message: 'one'}, {serializedhex: 'ff0200'}, {message: 'three'}]}], 6],
  ['private MMR', [{message: undefined, encrypttoaddress: PRIVATE, mmrdata: [{message: 'one'}, {message: 'two'}]}], 5],
  ['multipart with another group', [{message: 'private upload '.repeat(1200), encrypttoaddress: PRIVATE}, {}], 4],
  ['mixed content groups', [{}, {encrypttoaddress: PRIVATE}, {}], 6],
])('constructs and authenticates %s through the public SDK with no plaintext RPC', async (_, groups, count) => {
  const details = request(groups);
  const crypto = await build(details);
  const result = await prepare(details, crypto);
  expect(mockEncrypt).toHaveBeenCalledTimes(count);
  expect(mockDecrypt).toHaveBeenCalledTimes(count);
  expect(result.hex).not.toContain(Buffer.from('requested upload').toString('hex'));
  await expect(verifyIdentityUpdateData(details, result.hex, crypto.decryptData, SYSTEM)).resolves.toBe(true);
  expect(mockDecrypt).toHaveBeenCalledTimes(count * 2);
  crypto.dispose();
  expect(mockListeners.size).toBe(0);
});


it.each(['sha256', 'sha256D', 'blake2b'].flatMap(leaf =>
  ['sha256', 'sha256D', 'blake2b'].map(mmr => [leaf, mmr]),
))('authenticates MMR commitments with %s leaves and %s roots', async (hashtype, mmrhashtype) => {
  const details = request([{message: undefined, hashtype, mmrhashtype,
    mmrdata: [{message: 'first'}, {datahash: '12'.repeat(32)}, {serializedhex: 'ff0080'}],
    mmrsalt: ['23'.repeat(32), '34'.repeat(32), '45'.repeat(32)],
  }]);
  const crypto = await build(details);
  try {
    const result = await prepare(details, crypto);
    await expect(verifyIdentityUpdateData(details, result.hex, crypto.decryptData, SYSTEM)).resolves.toBe(true);
    expect(mockRandom).not.toHaveBeenCalled();
    // Every ordinary leaf, root, hash vector and reference must authenticate.
    expect(mockDecrypt.mock.calls.length).toBeGreaterThanOrEqual(10);
  } finally { crypto.dispose(); }
});

it.each([false, true])('preserves native VDXF byte-vector uploads (MMR: %s)', async mmr => {
  const value = {[DataByteVectorKey.vdxfid]: 'ff000180'};
  const details = request([{message: undefined, ...(mmr ? {mmrdata: [{vdxfdata: value}]} : {vdxfdata: value})}]);
  expect(() => details.toCLIJson()).toThrow();
  const crypto = await build(details);
  try {
    const result = await prepare(details, crypto);
    await expect(verifyIdentityUpdateData(details, result.hex, crypto.decryptData, SYSTEM)).resolves.toBe(true);
  } finally { crypto.dispose(); }
});

it('preserves exact UTF-8 metadata boundaries inside native binary descriptors', async () => {
  const details = request();
  const nested = new DataDescriptor({objectdata: Buffer.from('ff000180', 'hex'),
    vdxfKey: DataByteVectorKey.vdxfid, label: 'é'.repeat(32), mimeType: 'a'.repeat(128)});
  const value = new VdxfUniValue({values: [{[DataDescriptorKey.vdxfid]: nested}]});
  const upload = [...details.signDataMap.entries()][0][1];
  upload.dataType = DATA_TYPE_VDXFDATA.clone();
  upload.data = FqnVdxfUniValue.fromVdxfUniValue(value);
  const crypto = await build(details);
  try {
    const result = await prepare(details, crypto);
    await expect(verifyIdentityUpdateData(details, result.hex, crypto.decryptData, SYSTEM)).resolves.toBe(true);
  } finally { crypto.dispose(); }
});

it('rejects two multipart content groups instead of accepting ambiguous references', async () => {
  const details = request([{message: 'a'.repeat(10000)}, {message: 'b'.repeat(10000)}]);
  const crypto = await build(details);
  try {
    await expect(prepare(details, crypto)).rejects.toThrow(/multipart/i);
  } finally { crypto.dispose(); }
});

it('fails before any native encryption when local crypto is missing', async () => {
  const sdk = new VerusIdInterface(SYSTEM, 'http://unused.invalid');
  sdk.interface = new Proxy({}, {get: () => () => { throw new Error('No plaintext RPC allowed'); }});
  await expect(sdk.createUpdateIdentityTransaction(request(), sourceIdentity.primaryAddresses[0].toAddress(),
    source.toHex(), 100, undefined, SYSTEM, undefined, undefined, 30000,
  )).rejects.toThrow(/wallet crypto callbacks/i);
  expect(mockEncrypt).not.toHaveBeenCalled();
});
