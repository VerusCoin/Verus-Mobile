// Independent daemon-owned VDXF serialization. No wallet keys, signing, funding,
// transaction creation RPC, or broadcasts. Run through the opt-in daemon runner.
const {execFileSync} = require('child_process');
const p = require('verus-typescript-primitives');
const {rpc} = require('../../../../debug/identityUploadDaemonRpc.cjs');
const live = process.env.VERUS_UPLOAD_DAEMON_TEST === '1' ? describe : describe.skip;
const SYSTEM = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
let recipient;

const native = (...args) => execFileSync(process.env.VERUS_UPLOAD_NATIVE_CRYPTO, args, {
  encoding: 'utf8', timeout: 20000, maxBuffer: 8 * 1024 * 1024,
  stdio: ['pipe', 'pipe', 'pipe'],
}).trim();
const tagged = (key, value) => new p.BufferDataVdxfObject(value.toBuffer().toString('hex'), key).toBuffer();

// signdata's vdxfdata encoder invokes the daemon's CDataDescriptor,
// CMMRDescriptor and CCrossChainDataRef serializers. Decrypting its enclosing
// leaf gives those exact bytes, without going through a daemon JSON re-encoder.
const daemonBytes = values => {
  const result = rpc('signdata', [{createmmr: true, encrypttoaddress: recipient.address,
    mmrdata: values.map(vdxfdata => ({vdxfdata})), mmrsalt: values.map(() => '17'.repeat(32))}]);
  expect(result.signature).toBeUndefined();
  return result.mmrdescriptor_encrypted.datadescriptors.map(descriptor => {
    const plaintext = Buffer.from(native('decrypt', recipient.ivk, descriptor.epk, descriptor.objectdata), 'hex');
    const wrapper = new p.VDXFDataDescriptor();
    expect(wrapper.fromBuffer(plaintext)).toBe(plaintext.length);
    expect(wrapper.toBuffer()).toEqual(plaintext);
    expect(plaintext.length + 16).toBe(descriptor.objectdata.length / 2);
    expect(wrapper.dataDescriptor.salt).toEqual(Buffer.alloc(32, 0x17));
    return wrapper.dataDescriptor.objectdata;
  });
};

live('live daemon canonical VDXF container serialization', () => {
  beforeAll(() => {
    const info = rpc('getinfo');
    expect(info.testnet).toBe(true);
    expect(info.chainid).toBe(SYSTEM);
    const keys = JSON.parse(native('recipient'));
    const address = new p.SaplingPaymentAddress();
    address.fromBuffer(Buffer.from(keys.addressBytes, 'hex'));
    recipient = {address: address.toAddressString(), ivk: keys.ivk};
    const validated = rpc('z_validateaddress', [recipient.address]);
    expect(validated.isvalid).toBe(true);
    expect(validated.ismine).toBe(false);
  });

  test('matches descriptor bytes with binary payload and every optional byte field', () => {
    // Published secret fields here are synthetic serializer inputs, never an
    // identity upload. The upload verifier deliberately rejects their presence.
    const json = {version: 1, flags: 1, objectdata: 'ff008001fe', label: 'binary',
      mimetype: 'application/octet-stream', salt: '12'.repeat(32), epk: '23'.repeat(32),
      ivk: '34'.repeat(32), ssk: '45'.repeat(32)};
    expect(daemonBytes([{[p.DataDescriptorKey.vdxfid]: json}])[0])
      .toEqual(tagged(p.DataDescriptorKey.vdxfid, p.DataDescriptor.fromJson(json)));
  });

  test('matches nested descriptor metadata at the UTF-8 byte limits', () => {
    const inner = {version: 1, objectdata: 'ff00', label: 'é'.repeat(32), mimetype: 'a'.repeat(128)};
    const outer = {version: 1, objectdata: {[p.DataDescriptorKey.vdxfid]: inner}};
    expect(daemonBytes([{[p.DataDescriptorKey.vdxfid]: outer}])[0])
      .toEqual(tagged(p.DataDescriptorKey.vdxfid, p.DataDescriptor.fromJson(outer)));
    expect(() => p.DataDescriptor.fromJson({...inner, label: 'é'.repeat(33)})).toThrow();
    expect(() => p.DataDescriptor.fromJson({...inner, mimetype: 'a'.repeat(129)})).toThrow();
  });

  test('matches a complete encrypted MMR container serialized by the daemon', () => {
    const source = rpc('signdata', [{createmmr: true, encrypttoaddress: recipient.address,
      hashtype: 'sha256D', mmrhashtype: 'blake2b',
      mmrdata: [{serializedhex: 'ff000180'}, {message: 'nested encrypted MMR'}],
      mmrsalt: ['11'.repeat(32), '22'.repeat(32)]}]);
    expect(source.signature).toBeUndefined();
    const mmr = source.mmrdescriptor_encrypted;
    expect(daemonBytes([{[p.MMRDescriptorKey.vdxfid]: mmr}])[0])
      .toEqual(tagged(p.MMRDescriptorKey.vdxfid, p.MMRDescriptor.fromJson(mmr)));
  });

  test('matches local and cross-chain references including uint256 byte order', () => {
    const refs = [0, 127, 128, 253, 65535].map((index, i) => ({
      type: 0, version: 1, flags: 1, output: {txid: i ? '0123456789abcdef'.repeat(4) : '00'.repeat(32), voutnum: index},
      objectnum: index, subobject: index,
      ...(i ? {systemid: SYSTEM, datahash: 'fedcba9876543210'.repeat(4)} : {}),
    }));
    const actual = daemonBytes(refs.map(value => ({[p.CrossChainDataRefKey.vdxfid]: value})));
    refs.forEach((value, index) => expect(actual[index])
      .toEqual(tagged(p.CrossChainDataRefKey.vdxfid, p.CrossChainDataRef.fromJson(value))));
  });

  test('matches typed binary vectors across the CompactSize boundary', () => {
    const values = [252, 253].map(size => ({[p.DataByteVectorKey.vdxfid]:
      Buffer.from(Array.from({length: size}, (_, i) => i & 255)).toString('hex')}));
    const actual = daemonBytes(values);
    values.forEach((value, index) => expect(actual[index]).toEqual(p.VdxfUniValue.fromJson(value).toBuffer()));
  });

  test('records the daemon JSON base64 defect while requiring lossless local hex', () => {
    const payload = {serializedbase64: 'AP+A/w=='};
    const json = {version: 1, objectdata: payload};
    // key_io.cpp uses DecodeBase64's invalid flag as a validity flag. This is a
    // daemon compatibility boundary, not permission to discard upload bytes.
    const actual = daemonBytes([{[p.DataDescriptorKey.vdxfid]: json}])[0];
    expect(actual).toEqual(tagged(p.DataDescriptorKey.vdxfid, new p.DataDescriptor()));
    expect(() => p.VdxfUniValue.fromJson(payload)).toThrow(/serializedbase64/);
    expect(p.VdxfUniValue.fromJson({serializedhex: '00ff80ff'}).toBuffer()).toEqual(Buffer.from('00ff80ff', 'hex'));
  });
});
