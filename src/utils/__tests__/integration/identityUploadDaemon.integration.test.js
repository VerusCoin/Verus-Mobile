// Opt in with `node debug/runIdentityUploadDaemonTests.cjs`. This suite calls a
// real local VRSCTEST daemon; it is deliberately skipped in ordinary unit runs.
// The native boundary uses the daemon's librustzcash/libsodium, NOT mocked
// Sapling agreement or cached plaintext. Device bridge validation is separate.
const mockListeners = new Set();
const mockState = {authentication: {activeAccount: {accountHash: 'synthetic-audit'}, sessionEpoch: 1}};
const mockEncrypt = jest.fn();
const mockDecrypt = jest.fn();
const mockRecipient = jest.fn();
const mockMaterial = jest.fn(() => { throw new Error('No wallet material allowed'); });
jest.mock('../../../store', () => ({getState: () => mockState,
  subscribe: listener => { mockListeners.add(listener); return () => mockListeners.delete(listener); }}));
jest.mock('react-native-verus', () => ({Tools: {encryptVerusData: mockEncrypt, decryptVerusData: mockDecrypt}}));
jest.mock('../../api/channels/dlight/requests/zGetEncryptionAddress', () => ({zGetEncryptionAddress: mockRecipient}));
jest.mock('../../crypto/getKeyMaterial', () => ({getKeyMaterial: mockMaterial}));
jest.mock('../../keyGenerator/keyGenerator', () => ({getKey: jest.fn(async () => 'synthetic native test recipient')}));
jest.mock('../../crypto/randomBytes', () => ({randomBytes: async size => require('crypto').randomBytes(size)}));

const {execFileSync} = require('child_process');
const p = require('verus-typescript-primitives');
const {Transaction, networks} = require('@bitgo/utxo-lib');
const {VerusIdInterface, verifyIdentityUpdateData} = require('verusid-ts-client');
const {readIdentityUpdateEvidence} = require('verusid-ts-client/lib/identity/updateDataEvidence');
const {parseScript} = require('verusid-ts-client/lib/identity/fundingPrimitives');
const {createLocalIdentityUploadCrypto} = require('../../identityUpdate/localUploadCrypto');
const {createAuthenticatedUploadDecryptor} = require('../../identityUpdate/uploadDecryption');
const {getConditionID} = require('../../crypto/encryptCredentials');
const {rpc, calls} = require('../../../../debug/identityUploadDaemonRpc.cjs');
const SYSTEM = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const HASHES = ['sha256', 'sha256D', 'blake2b'];
const KEY = p.DataStringKey.vdxfid;
const live = process.env.VERUS_UPLOAD_DAEMON_TEST === '1' ? describe : describe.skip;
let info, source, rawSource, outsideRecipient, records, publicRecipients;
const native = (...args) => execFileSync(process.env.VERUS_UPLOAD_NATIVE_CRYPTO, args, {
  encoding: 'utf8', timeout: 20000, maxBuffer: 8 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'],
}).trim();
const recipient = () => {
  const result = JSON.parse(native('recipient'));
  const address = new p.SaplingPaymentAddress();
  address.fromBuffer(Buffer.from(result.addressBytes, 'hex'));
  return {address: address.toAddressString(), ivk: result.ivk};
};
const untag = bytes => {
  const value = new p.VDXFDataDescriptor();
  expect(value.fromBuffer(bytes)).toBe(bytes.length);
  expect(value.toBuffer()).toEqual(bytes);
  return value.dataDescriptor;
};
const request = uploads => p.IdentityUpdateRequestDetails.fromCLIJson({
  name: source.identity.name, parent: source.identity.parent,
  contentmultimap: Object.fromEntries(uploads.map((upload, i) => [
    i ? p.nameAndParentAddrToIAddr(`mobile-upload-audit-${i}`, SYSTEM) : KEY,
    {data: {createmmr: true, ...upload}},
  ])),
});
const context = (address, contentKey = KEY) => ({contentKey, encryptToAddress: address});
const makeCrypto = details => createLocalIdentityUploadCrypto({systemId: SYSTEM, request: details});

// Use the public SDK entry point and the actual Mobile operation adapter. Any
// network use from construction is a test failure, even a harmless chain read.
async function build(details, crypto) {
  const sdk = new VerusIdInterface('VRSCTEST', 'http://unused.invalid');
  sdk.interface = new Proxy({}, {get: (_, method) => () => { throw new Error(`Unexpected builder RPC: ${String(method)}`); }});
  return sdk.createUpdateIdentityTransaction(details, source.identity.primaryaddresses[0], rawSource,
    source.blockheight, undefined, SYSTEM, undefined, undefined, info.blocks, undefined,
    false, true, false, crypto.decryptData, crypto);
}

async function checkBuilt(details, crypto) {
  const built = await build(details, crypto);
  await expect(verifyIdentityUpdateData(details, built.hex, crypto.decryptData, SYSTEM)).resolves.toBe(true);
  const tx = Transaction.fromHex(built.hex, networks.verus);
  const decoded = rpc('decoderawtransaction', [built.hex]);
  expect(decoded.txid).toBe(tx.getId());
  expect(decoded.expiryheight).toBe(tx.expiryHeight);
  expect(decoded.vout.map(out => out.scriptPubKey.hex)).toEqual(tx.outs.map(out => out.script.toString('hex')));
  const definitions = decoded.vout.filter(out => out.scriptPubKey.identityprimary !== undefined);
  expect(definitions).toHaveLength(1);
  expect(definitions[0].scriptPubKey.identityprimary).not.toBe('invalid');
  expect(p.Identity.fromJson(definitions[0].scriptPubKey.identityprimary).toBuffer()).toEqual(built.identity.toBuffer());
  const descriptorCount = [...details.signDataMap.entries()].reduce((total, [, upload]) => {
    const leaves = upload.isMMRData() ? upload.data.data.length : 1;
    return total + leaves + (leaves > 1 ? 3 : 1);
  }, 0);
  expect(records).toHaveLength(descriptorCount);
  const privateRecords = records.filter(record => record.address === outsideRecipient.address);
  const sskCalls = mockDecrypt.mock.calls.filter(args => args[3]);
  if (privateRecords.length) expect(sskCalls.length).toBeGreaterThanOrEqual(privateRecords.length);
  else expect(sskCalls).toHaveLength(0);
  expect(sskCalls.every(args => args[0] === null)).toBe(true);
  expect(mockEncrypt.mock.calls.filter(args => args[2])).toHaveLength(privateRecords.length);
  const groups = readIdentityUpdateEvidence(tx.outs, SYSTEM);
  expect(groups.size).toBe(details.signDataMap.size);
  for (const [index, group] of groups) {
    for (const outputIndex of group.outputIndexes) {
      const evidence = decoded.vout[outputIndex].scriptPubKey.notaryevidence;
      expect(evidence).toMatchObject({version: 1, type: group.outputIndexes.length > 1 ? 2 : 3,
        systemid: SYSTEM, output: {txid: '00'.repeat(32), voutnum: 0}, state: 2});
      const smart = parseScript(p.SmartTransactionScript, tx.outs[outputIndex].script);
      const localEvidence = new p.NotaryEvidence();
      localEvidence.fromBuffer(smart.paramsOptCC.vData[0]);
      expect(p.CrossChainProof.fromJson(evidence.evidence).toBuffer()).toEqual(localEvidence.evidence.toBuffer());
    }
    const key = [...details.signDataMap.entries()].sort(([a], [b]) =>
      p.fromBase58Check(a.toAddress()).hash.compare(p.fromBase58Check(b.toAddress()).hash)
    )[[...groups.keys()].indexOf(index)][0].toAddress();
    const encryptedLink = untag(built.identity.contentMultiMap.kvContent.getByAddress(key)[0]);
    const encryptedRecord = records.find(record => record.epk === encryptedLink.epk.toString('hex'));
    expect(encryptedRecord).toBeDefined();
    const inner = untag(encryptedRecord.plaintext);
    const wrapper = new p.BufferDataVdxfObject();
    expect(wrapper.fromBuffer(inner.objectdata)).toBe(inner.objectdata.length);
    expect(wrapper.vdxfkey).toBe(p.CrossChainDataRefKey.vdxfid);
    const reference = new p.CrossChainDataRef();
    reference.fromBuffer(wrapper.toDataBuffer());
    expect(reference.toJson().output.voutnum).toBe(index);
    expect(reference.toJson().output.txid).toBe('00'.repeat(32));
    const upload = details.signDataMap.getByAddress(key);
    if (upload.encryptToAddress) {
      expect(encryptedLink.ivk).toBeUndefined();
      expect(encryptedLink.ssk).toBeUndefined();
    } else {
      expect(encryptedLink.ivk).toHaveLength(32);
      expect(publicRecipients.some(value => value.ivk === encryptedLink.ivk.toString('hex'))).toBe(true);
    }
  }
  // The independent daemon authenticates every locally encrypted leaf, MMR
  // root, hash vector and link (not just our adapter's round-trip result).
  for (const record of records) {
    const keys = record.address === outsideRecipient.address ? outsideRecipient :
      publicRecipients.find(value => value.address === record.address);
    expect(keys).toBeDefined();
    const encrypted = {version: 1, flags: 5, epk: record.epk, objectdata: record.ciphertext};
    const plaintext = rpc('decryptdata', [{datadescriptor: encrypted, ivk: keys.ivk, retrieve: false}]);
    const plain = untag(record.plaintext);
    const value = new p.VdxfUniValue();
    value.fromBuffer(plain.objectdata);
    // Daemon display JSON drops the byte-vector tag. Assert that explicit
    // projection only for this binary type; construction never uses it.
    const binary = value.values.length === 1 && value.values[0][p.DataByteVectorKey.vdxfid];
    const expected = binary ? binary.toString('hex') : plain.toJson().objectdata;
    // decryptdata always wraps an object in an array; its JSON is a display
    // representation. Exact tagged bytes are checked independently above.
    expect(plaintext).toEqual(expected && !Array.isArray(expected) && typeof expected === 'object' ? [expected] : expected);
    expect(record.ciphertext.length / 2).toBe(record.plaintext.length + 16);
  }
  expect(new Set(records.map(record => record.epk)).size).toBe(records.length);
  expect(mockMaterial).not.toHaveBeenCalled();
  return {built, tx, groups};
}

live('live testnet daemon identity upload conformance', () => {
  beforeAll(() => {
    info = rpc('getinfo');
    expect(info.testnet).toBe(true);
    expect(info.chainid).toBe(SYSTEM);
    source = rpc('getidentity', [process.env.VERUS_UPLOAD_TEST_IDENTITY || 'alice@']);
    rawSource = rpc('getrawtransaction', [source.txid]);
    outsideRecipient = recipient();
    const validated = rpc('z_validateaddress', [outsideRecipient.address]);
    expect(validated.isvalid).toBe(true);
    expect(validated.ismine).toBe(false);
    console.info(`Live upload oracle: ${info.VRSCversion}, VRSCTEST height ${info.blocks}; no wallet writes/signing/broadcast.`);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    records = [];
    publicRecipients = [];
    mockRecipient.mockImplementation(async () => {
      const result = recipient(); publicRecipients.push(result); return result;
    });
    mockEncrypt.mockImplementation(async (address, plaintextHex, returnSsk) => {
      const bytes = p.SaplingPaymentAddress.fromAddressString(address).toBuffer();
      const result = JSON.parse(native('encrypt', bytes.toString('hex'), plaintextHex, ...(returnSsk ? ['temporary-ssk'] : [])));
      records.push({address, plaintext: Buffer.from(plaintextHex, 'hex'), epk: result.epk, ciphertext: result.ciphertext});
      return {ephemeralPublicKey: result.epk, encryptedData: result.ciphertext, ...(returnSsk ? {symmetricKey: result.ssk} : {})};
    });
    mockDecrypt.mockImplementation(async (ivk, epk, ciphertext, ssk) =>
      ssk ? native('decrypt-ssk', ssk, ciphertext) : native('decrypt', ivk, epk, ciphertext));
  });
  afterEach(() => { expect(mockListeners.size).toBe(0); });

  test.each(HASHES.flatMap(hash => HASHES.flatMap(mmr => [1, 2, 3, 5, 7].map(count => [hash, mmr, count]))))(
    'matches daemon salted commitments %s / %s with %i leaves', async (hashtype, mmrhashtype, count) => {
      const upload = {createmmr: true, hashtype, mmrhashtype, encrypttoaddress: outsideRecipient.address,
        mmrdata: Array.from({length: count}, (_, i) => ({serializedhex: Buffer.from(`live ${i}: é\0${'x'.repeat(i)}`).toString('hex')})),
        mmrsalt: Array.from({length: count}, (_, i) => Buffer.alloc(32, i + 1).toString('hex'))};
      const oracle = rpc('signdata', [upload]);
      expect(oracle.signature).toBeUndefined();
      expect(oracle.mmrdescriptor.datadescriptors).toHaveLength(count);
      expect(oracle.mmrdescriptor_encrypted.datadescriptors).toHaveLength(count);
      const details = request([upload]);
      const crypto = await makeCrypto(details);
      try {
        const {groups} = await checkBuilt(details, crypto);
        expect([...groups.values()][0].outputIndexes).toHaveLength(1);
        const plaintexts = records.map(record => untag(record.plaintext));
        oracle.mmrdescriptor.datadescriptors.forEach((leaf, i) => {
          expect(plaintexts[i].toBuffer()).toEqual(p.DataDescriptor.fromJson(leaf).toBuffer());
        });
        if (count > 1) {
          expect(plaintexts[count].toBuffer()).toEqual(p.DataDescriptor.fromJson(oracle.mmrdescriptor.mmrroot).toBuffer());
          expect(plaintexts[count + 1].toBuffer()).toEqual(p.DataDescriptor.fromJson(oracle.mmrdescriptor.mmrhashes).toBuffer());
        }
        // Independent daemon ciphertexts must authenticate through Mobile's
        // actual descriptor validator with a genuine disposable IVK.
        const authenticate = createAuthenticatedUploadDecryptor({request: details, assertActive: () => {},
          resolveKeys: () => ({ivk: Buffer.from(outsideRecipient.ivk, 'hex')})});
        const encrypted = oracle.mmrdescriptor_encrypted;
        for (const [ciphertext, plain] of [
          [encrypted.mmrroot, oracle.mmrdescriptor.mmrroot],
          [encrypted.mmrhashes, oracle.mmrdescriptor.mmrhashes],
          ...encrypted.datadescriptors.map((value, i) => [value, oracle.mmrdescriptor.datadescriptors[i]]),
        ]) {
          await expect(authenticate(p.DataDescriptor.fromJson(ciphertext), context(outsideRecipient.address)))
            .resolves.toEqual(new p.VDXFDataDescriptor(p.DataDescriptor.fromJson(plain), p.DataDescriptorKey.vdxfid).toBuffer());
        }
      } finally { crypto.dispose(); }
    }, 30000);

  test.each(HASHES)('matches daemon %s hash-only byte order in mixed MMR', async hashtype => {
    const upload = {createmmr: true, hashtype, mmrhashtype: 'blake2b', encrypttoaddress: outsideRecipient.address,
      mmrdata: [{datahash: '0123456789abcdef'.repeat(4)}, {serializedhex: 'ff008001'}],
      mmrsalt: ['11'.repeat(32), '22'.repeat(32)]};
    const oracle = rpc('signdata', [upload]);
    const details = request([upload]);
    const crypto = await makeCrypto(details);
    try {
      await checkBuilt(details, crypto);
      expect(untag(records[2].plaintext).toBuffer()).toEqual(p.DataDescriptor.fromJson(oracle.mmrdescriptor.mmrroot).toBuffer());
      expect(untag(records[3].plaintext).toBuffer()).toEqual(p.DataDescriptor.fromJson(oracle.mmrdescriptor.mmrhashes).toBuffer());
    } finally { crypto.dispose(); }
  });

  test.each([
    ['public single', [{message: 'public synthetic upload'}], 1],
    ['external private single', [{message: 'private synthetic upload', private: true}], 1],
    ['mixed public/private groups', [{message: 'one'}, {message: 'two', private: true}, {message: 'three'}], 1],
    ['multipart and single groups', [{message: 'é'.repeat(10000), private: true}, {message: 'last'}], 4],
    ['binary VDXF', [{vdxfdata: {[p.DataByteVectorKey.vdxfid]: 'ff000180'}}], 1],
    ['VDXF array MMR', [{mmrdata: [{vdxfdata: {[p.DataStringKey.vdxfid]: 'typed data'}}, {serializedhex: 'ff0001'}]}], 1],
  ])('daemon decodes and decrypts %s built by Mobile', async (_, uploads, maxParts) => {
    const details = request(uploads.map(({private: isPrivate, ...upload}) => ({...upload,
      ...(isPrivate ? {encrypttoaddress: outsideRecipient.address} : {})})));
    const crypto = await makeCrypto(details);
    try {
      const {groups} = await checkBuilt(details, crypto);
      expect(Math.max(...[...groups.values()].map(group => group.outputIndexes.length))).toBe(maxParts);
      expect(new Set(publicRecipients.map(value => value.ivk)).size).toBe(publicRecipients.length);
    } finally { crypto.dispose(); }
  });

  test.each(['ciphertext', 'tag', 'ivk', 'epk'])('daemon and Mobile reject changed %s', async field => {
    const details = request([{message: 'authenticated data', encrypttoaddress: outsideRecipient.address}]);
    const crypto = await makeCrypto(details);
    try {
      await build(details, crypto);
      const record = records[0];
      const descriptor = p.DataDescriptor.fromJson({version: 1, flags: 5, epk: record.epk, objectdata: record.ciphertext});
      let ivk = Buffer.from(outsideRecipient.ivk, 'hex');
      if (field === 'ivk') ivk = Buffer.from(recipient().ivk, 'hex');
      if (field === 'epk') descriptor.epk = Buffer.from(JSON.parse(native('encrypt',
        p.SaplingPaymentAddress.fromAddressString(outsideRecipient.address).toBuffer().toString('hex'), '00')).epk, 'hex');
      if (field === 'ciphertext') descriptor.objectdata[0] ^= 1;
      if (field === 'tag') descriptor.objectdata[descriptor.objectdata.length - 1] ^= 1;
      expect(() => rpc('decryptdata', [{datadescriptor: descriptor.toJson(), ivk: ivk.toString('hex')}])).toThrow();
      const authenticate = createAuthenticatedUploadDecryptor({request: details, assertActive: () => {}, resolveKeys: () => ({ivk})});
      await expect(authenticate(descriptor, context(outsideRecipient.address))).rejects.toThrow();
    } finally { crypto.dispose(); }
  });

  test('authenticates public links after disposal using their published IVK', async () => {
    const details = request([{message: 'readable without wallet keys'}]);
    const crypto = await makeCrypto(details);
    let built;
    try { ({built} = await checkBuilt(details, crypto)); } finally { crypto.dispose(); }
    const decrypt = createAuthenticatedUploadDecryptor({request: details, assertActive: () => {}, resolveKeys: descriptor => ({ivk: descriptor.ivk})});
    await expect(verifyIdentityUpdateData(details, built.hex, decrypt, SYSTEM)).resolves.toBe(true);
    expect(mockMaterial).not.toHaveBeenCalled();
  });

  test('rejects misplaced and missing multipart evidence before signing', async () => {
    const details = request([{message: 'z'.repeat(20000), encrypttoaddress: outsideRecipient.address}]);
    const crypto = await makeCrypto(details);
    try {
      const {tx} = await checkBuilt(details, crypto);
      const swapped = Transaction.fromHex(tx.toHex(), networks.verus);
      [swapped.outs[0], swapped.outs[1]] = [swapped.outs[1], swapped.outs[0]];
      await expect(verifyIdentityUpdateData(details, swapped.toHex(), crypto.decryptData, SYSTEM)).rejects.toThrow();
      tx.outs.splice(1, 1);
      await expect(verifyIdentityUpdateData(details, tx.toHex(), crypto.decryptData, SYSTEM)).rejects.toThrow();
    } finally { crypto.dispose(); }
  });

  test('forbids wallet mutations and signed signdata in the oracle transport', () => {
    for (const method of ['updateidentity', 'fundrawtransaction', 'signrawtransaction', 'sendrawtransaction', 'z_getencryptionaddress']) {
      expect(() => rpc(method, [])).toThrow(/Forbidden/);
      expect(calls).not.toContain(method);
    }
    expect(() => rpc('signdata', [{createmmr: true, address: SYSTEM, message: 'x'}])).toThrow(/unsigned/);
    expect(() => rpc('signdata', [{createmmr: true, filename: '/tmp/unused'}])).toThrow(/inline/);
  });

  test('matches the daemon credential condition-key uint256 byte order', () => {
    const synthetic = '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';
    const oracle = rpc('getvdxfid', ['vrsc::identity.credential', {uint256: synthetic}]);
    const local = getConditionID(p.IDENTITY_CREDENTIAL.vdxfid, synthetic);
    expect(p.toBase58Check(local, p.I_ADDR_VERSION)).toBe(oracle.vdxfid);
    expect(local.toString('hex')).toBe(p.fromBase58Check(oracle.vdxfid).hash.toString('hex'));
  });
});
