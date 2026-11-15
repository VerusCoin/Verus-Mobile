const mockDecrypt = jest.fn();
jest.mock('../../../store', () => ({}));
jest.mock('react-native-verus', () => ({Tools: {decryptVerusData: mockDecrypt}}));

const BN = require('bn.js');
const {Transaction, networks, smarttxs} = require('@bitgo/utxo-lib');
const {
  BufferDataVdxfObject, ContentMultiMap, CrossChainDataRef, CrossChainDataRefKey,
  CrossChainProof, DataDescriptor, DataDescriptorKey, DataStringKey, ETypes, EVALS,
  EvidenceData, Identity, IdentityScript, IdentityUpdateRequestDetails, OptCCParams,
  PBaaSEvidenceRef, PubKey, SmartTransactionScript, TxDestination, UTXORef,
  VDXFDataDescriptor, fromBase58Check, MultiPartDescriptor,
} = require('verus-typescript-primitives');
const {verifyIdentityUpdateData} = require('verusid-ts-client');
const {createAuthenticatedUploadDecryptor} = require('../../identityUpdate/uploadDecryption');
const {createDecipheriv} = require('crypto');
const {jubjub} = require('@noble/curves/misc');
const {blake2b} = require('@noble/hashes/blake2');
const historical = require('../fixtures/identityUploadHistorical.json');

const SYSTEM = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const PRIVATE = 'zs1e0r2fuxpn6kymwa656trkwk8mpwzj03ucpw6kpvje5gjl6mgtjgdvafcgl54su2uclwgw6v24em';
const IVK = Buffer.from(Array.from({length: 32}, (_, i) => i));
const vdxf = (key, data) => new BufferDataVdxfObject(data.toString('hex'), key).toBuffer();
const evidenceBytes = (proof, multipart = false) => Buffer.concat([
  Buffer.from([1, multipart ? 2 : 3]), fromBase58Check(SYSTEM).hash,
  Buffer.alloc(36), Buffer.from([2]), proof.toBuffer(),
]);
const evidenceOutput = data => {
  const destination = new TxDestination(new PubKey(Buffer.from(
    '03e1894e9d487125be5a8c6657a8ce01bc81ba7816d698dbfcfb0483754eb5a2d9', 'hex',
  )));
  const params = (evalCode, vData) => new OptCCParams({
    version: new BN(3), evalCode: new BN(evalCode), m: new BN(1), n: new BN(1),
    destinations: [destination], vData,
  });
  return {value: 0, script: new SmartTransactionScript(
    params(EVALS.EVAL_NONE, []), params(EVALS.EVAL_NOTARY_EVIDENCE, [data]),
  ).toBuffer()};
};

// Real primitives, evidence framing and SDK verification; only native Sapling
// cryptography is replaced by an authenticated-ciphertext lookup for offline JS.
const fixture = ({privateUpload = false, message = 'requested upload', returned = message, metadata} = {}) => {
  const plaintexts = new Map();
  let nextCiphertext = 0;
  const encrypt = (plaintext, publicLink = false) => {
    const wrapper = new VDXFDataDescriptor(plaintext, DataDescriptorKey.vdxfid).toBuffer();
    const ciphertext = Buffer.alloc(wrapper.length + 16);
    ciphertext.writeUInt32LE(++nextCiphertext);
    const epk = Buffer.alloc(32, nextCiphertext);
    plaintexts.set(ciphertext.toString('hex'), {wrapper, epk: epk.toString('hex')});
    return new DataDescriptor({
      flags: DataDescriptor.FLAG_ENCRYPTED_DATA, objectdata: ciphertext, epk,
      ...(publicLink ? {ivk: IVK} : {}),
    });
  };
  const identity = Identity.fromJson({
    version: 3, flags: 0, name: 'upload-test', parent: SYSTEM, systemid: SYSTEM,
    primaryaddresses: ['RP1j8ziHUzgs6THJiAQa2BiqjRLLCWQxAk'], minimumsignatures: 1,
    recoveryauthority: SYSTEM, revocationauthority: SYSTEM,
    contentmap: {}, contentmultimap: {}, timelock: 0,
  });
  const request = IdentityUpdateRequestDetails.fromCLIJson({
    name: identity.name, parent: SYSTEM,
    contentmultimap: {[DataStringKey.vdxfid]: {data: {
      message, createmmr: true, ...(privateUpload ? {encrypttoaddress: PRIVATE} : {}),
    }}},
  });
  const leaf = encrypt(new DataDescriptor({
    objectdata: Buffer.from(returned), salt: Buffer.alloc(32, 9), ...(metadata || {}),
  }));
  const proof = new CrossChainProof({chainObjects: [new EvidenceData({
    version: new BN(1), type: new BN(ETypes.TYPE_DATA),
    vdxfd: DataDescriptorKey.vdxfid,
    data_vec: new VDXFDataDescriptor(leaf, DataDescriptorKey.vdxfid).toBuffer(),
  })]});
  const evidence = evidenceBytes(proof);
  const tx = Transaction.fromHex(smarttxs.createUnfundedIdentityUpdate(
    identity.toBuffer().toString('hex'), networks.verus, 30020,
  ), networks.verus);
  tx.outs = [];
  if (evidence.length < 5724) tx.outs.push(evidenceOutput(evidence));
  else {
    for (let start = 0; start < evidence.length; start += 5724) {
      const chunk = new EvidenceData({
        version: new BN(1), type: new BN(ETypes.TYPE_MULTIPART_DATA),
        md: new MultiPartDescriptor({
          index: new BN(tx.outs.length), total_length: new BN(evidence.length), start: new BN(start),
        }),
        vdxfd: '', data_vec: evidence.subarray(start, start + 5724),
      });
      tx.outs.push(evidenceOutput(evidenceBytes(new CrossChainProof({chainObjects: [chunk]}), true)));
    }
  }
  const reference = new CrossChainDataRef(new PBaaSEvidenceRef({
    flags: PBaaSEvidenceRef.FLAG_ISEVIDENCE,
    output: new UTXORef({hash: Buffer.alloc(32), n: new BN(0)}),
    objectNum: new BN(0), subObject: new BN(0),
  }));
  const link = encrypt(new DataDescriptor({
    objectdata: vdxf(CrossChainDataRefKey.vdxfid, reference.toBuffer()),
  }), !privateUpload);
  identity.contentMultiMap = ContentMultiMap.fromJson({
    [DataStringKey.vdxfid]: [new VDXFDataDescriptor(link, DataDescriptorKey.vdxfid).toBuffer().toString('hex')],
  });
  tx.outs.push({value: 0, script: IdentityScript.fromIdentity(identity).toBuffer()});
  mockDecrypt.mockImplementation(async (ivk, epk, ciphertext) => {
    const authenticated = plaintexts.get(ciphertext);
    if (ivk !== IVK.toString('hex') || authenticated?.epk !== epk) throw new Error('Authentication failed');
    return authenticated.wrapper.toString('hex');
  });
  return {request, tx};
};
const authenticate = request => createAuthenticatedUploadDecryptor({request, assertActive: () => {},
  resolveKeys: descriptor => ({ivk: descriptor.ivk || IVK}),
});
const verify = async f => verifyIdentityUpdateData(f.request, f.tx.toHex(), authenticate(f.request));

beforeEach(() => jest.clearAllMocks());

it.each([false, true])('verifies public/private PartialSignData using the raw native adapter (private: %s)', async privateUpload => {
  const f = fixture({privateUpload});
  await expect(verify(f)).resolves.toBe(true);
  expect(mockDecrypt).toHaveBeenCalledTimes(2);
});

it('verifies multipart single-upload evidence and inherits the public link IVK', async () => {
  const f = fixture({message: 'large upload '.repeat(1200)});
  expect(f.tx.outs.length).toBeGreaterThan(2);
  await expect(verify(f)).resolves.toBe(true);
  expect(mockDecrypt.mock.calls.every(call => call[0] === IVK.toString('hex'))).toBe(true);
});

it('rejects decrypted content that differs from the requested bytes', async () => {
  await expect(verify(fixture({returned: 'substituted data'}))).rejects.toThrow();
});

it('rejects unexpected label metadata', async () => {
  await expect(verify(fixture({metadata: {label: 'unrequested'}}))).rejects.toThrow('metadata');
});

it('rejects a missing decryption callback', async () => {
  const f = fixture();
  await expect(verifyIdentityUpdateData(f.request, f.tx.toHex())).rejects.toThrow('decryption callback');
});

it('rejects altered ciphertext instead of returning partial plaintext', async () => {
  const f = fixture();
  mockDecrypt.mockRejectedValue(new Error('Authentication failed'));
  await expect(verify(f)).rejects.toThrow('Authentication failed');
});

it('rejects evidence output reordering', async () => {
  const f = fixture({message: 'large upload '.repeat(1200)});
  [f.tx.outs[0], f.tx.outs[1]] = [f.tx.outs[1], f.tx.outs[0]];
  await expect(verify(f)).rejects.toThrow();
});

// The native implementation uses these same Sapling key-agreement/KDF and
// authenticated-cipher rules. This checks the real historical ciphertext and
// native hex conversion contract without requiring a device or wallet secrets.
const decryptHistorical = (ivkHex, epkHex, ciphertextHex) => {
  const epk = Buffer.from(epkHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const scalar = BigInt(`0x${Buffer.from(ivkHex, 'hex').reverse().toString('hex')}`);
  const shared = jubjub.Point.fromBytes(epk).multiply(scalar).multiply(BigInt(8)).toBytes();
  const key = blake2b(Buffer.concat([Buffer.from(shared), epk]), {
    dkLen: 32, personalization: Buffer.from('Zcash_SaplingKDF'),
  });
  const decipher = createDecipheriv('chacha20-poly1305', Buffer.from(key), Buffer.alloc(12), {authTagLength: 16});
  decipher.setAuthTag(ciphertext.subarray(-16));
  return Buffer.concat([decipher.update(ciphertext.subarray(0, -16)), decipher.final()]).toString('hex');
};
const historicalVerification = async () => {
  // The new parser rejects these formerly discarded metadata fields. A
  // deliberately different request without them still must reject the actual
  // authenticated historical evidence carrying unrequested metadata.
  const requested = JSON.parse(JSON.stringify(historical.request));
  Object.values(requested.contentmultimap).forEach(({data}) => {
    data.mmrdata = data.mmrdata.map(({message}) => ({message}));
  });
  const request = IdentityUpdateRequestDetails.fromCLIJson(requested, {});
  return verifyIdentityUpdateData(request, historical.hex, authenticate(request));
};

it('rejects unsupported metadata before the new request parser can discard it', () => {
  expect(() => IdentityUpdateRequestDetails.fromCLIJson(historical.request, {})).toThrow('exactly one supported data key');
});

it('authenticates actual daemon upload wrappers, then rejects unrequested metadata', async () => {
  mockDecrypt.mockImplementation(decryptHistorical);
  await expect(historicalVerification()).rejects.toThrow('Unexpected identity upload descriptor metadata');
  expect(mockDecrypt).toHaveBeenCalledTimes(4);
});

it.each(['ivk', 'ciphertext'])('rejects real historical authentication with altered %s', async modified => {
  mockDecrypt.mockImplementation((ivk, epk, ciphertext) => {
    const bytes = Buffer.from(modified === 'ivk' ? ivk : ciphertext, 'hex');
    bytes[0] ^= 1;
    return decryptHistorical(modified === 'ivk' ? bytes.toString('hex') : ivk, epk,
      modified === 'ciphertext' ? bytes.toString('hex') : ciphertext);
  });
  await expect(historicalVerification()).rejects.toThrow();
  expect(mockDecrypt).toHaveBeenCalledTimes(1);
});
