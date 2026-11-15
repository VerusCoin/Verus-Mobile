let mockState;
const mockDecrypt = jest.fn();
const operations = new Set();
jest.mock('../../../store', () => ({getState: () => mockState, subscribe: () => () => {}}));
jest.mock('react-native-verus', () => ({Tools: {decryptVerusData: mockDecrypt}}));

const {
  BufferDataVdxfObject, DataDescriptor, DataDescriptorKey, VDXFDataDescriptor, IdentityUpdateRequestDetails,
  DataStringKey, SaplingPaymentAddress,
} = require('verus-typescript-primitives');
const {createAuthenticatedUploadDecryptor, createUploadOperationGuard} = require('../../identityUpdate/uploadDecryption');
const {assertIdentityUpdateRequestConstraints} = require('../../deeplink/validator/identityUpdateRequestValidator');
const {assertSupportedIdentityUploads} = require('../../identityUpdate/uploadPolicy');

const SYSTEM = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const PRIVATE = 'zs1e0r2fuxpn6kymwa656trkwk8mpwzj03ucpw6kpvje5gjl6mgtjgdvafcgl54su2uclwgw6v24em';
const IVK = Buffer.from(Array.from({length: 32}, (_, i) => i + 1));
const EPK = Buffer.from(Array.from({length: 32}, (_, i) => 63 - i));
const WRAPPER = new VDXFDataDescriptor(new DataDescriptor({objectdata: Buffer.from('requested upload')}),
  DataDescriptorKey.vdxfid).toBuffer();
const request = privateUpload => {
  const details = IdentityUpdateRequestDetails.fromCLIJson({
    name: 'upload-test', parent: SYSTEM,
    contentmultimap: {[DataStringKey.vdxfid]: {data: {message: 'requested upload'}}},
  });
  // Exercise fields assigned without updating serialization flags.
  if (privateUpload) [...details.signDataMap.entries()][0][1].encryptToAddress =
    SaplingPaymentAddress.fromAddressString(PRIVATE);
  return details;
};
const descriptor = privateUpload => new DataDescriptor({
  flags: DataDescriptor.FLAG_ENCRYPTED_DATA,
  objectdata: Buffer.alloc(WRAPPER.length + 16, 23), epk: EPK,
  ...(privateUpload ? {} : {ivk: IVK}),
});
const context = privateUpload => ({
  contentKey: DataStringKey.vdxfid, encryptToAddress: privateUpload ? PRIVATE : undefined,
});
const authenticate = details => {
  const operation = createUploadOperationGuard();
  operations.add(operation);
  const decrypt = createAuthenticatedUploadDecryptor({request: details, assertActive: operation.assertActive,
    resolveKeys: () => ({ivk: IVK}),
  });
  return (descriptor, context) => operation.run(() => decrypt(descriptor, context));
};
const build = (privateUpload = false) => authenticate(request(privateUpload));

beforeEach(() => {
  jest.clearAllMocks();
  mockState = {authentication: {activeAccount: {accountHash: 'account'}, sessionEpoch: 1}};
  mockDecrypt.mockResolvedValue(WRAPPER.toString('hex'));
});
afterEach(() => { operations.forEach(operation => operation.dispose()); operations.clear(); });

describe('authenticated raw upload callback', () => {
  it('returns the entire descriptor wrapper and passes native IVK/EPK bytes without reversal', async () => {
    const decrypt = await build();
    expect(await decrypt(descriptor(), context())).toEqual(WRAPPER);
    expect(mockDecrypt).toHaveBeenCalledWith(
      IVK.toString('hex'), EPK.toString('hex'), descriptor().objectdata.toString('hex'), null,
    );
  });

  it('rejects a changed recipient or content key', async () => {
    const decrypt = await build();
    await expect(decrypt(descriptor(), context(true))).rejects.toThrow('recipient changed');
    await expect(decrypt(descriptor(), {...context(), contentKey: SYSTEM})).rejects.toThrow('recipient changed');
    expect(mockDecrypt).not.toHaveBeenCalled();
  });

  it('never accepts a published IVK for a private recipient', async () => {
    const decrypt = await build(true);
    await expect(decrypt(descriptor(), context(true))).rejects.toThrow('Unexpected public key');
    expect(mockDecrypt).not.toHaveBeenCalled();
  });

  it.each(['wrong key', 'altered ciphertext'])('rejects native authentication failures: %s', async message => {
    const decrypt = await build();
    mockDecrypt.mockRejectedValue(new Error(message));
    await expect(decrypt(descriptor(), context())).rejects.toThrow(message);
  });

  it.each(['text plaintext', '0', '00zz', '', null, true, {objectdata: '00'}, Buffer.from(WRAPPER)])(
    'rejects malformed native output %j', async malformed => {
      const decrypt = await build();
      mockDecrypt.mockResolvedValue(malformed);
      await expect(decrypt(descriptor(), context())).rejects.toThrow('Invalid authenticated');
    });

  it('rejects truncated plaintext and incomplete keys', async () => {
    const decrypt = await build();
    mockDecrypt.mockResolvedValue('01');
    await expect(decrypt(descriptor(), context())).rejects.toThrow('plaintext length');
    await expect((await build())({...descriptor(), epk: Buffer.alloc(31)}, context())).rejects.toThrow('ephemeral key');
  });

  it('rejects account changes before or during native decryption', async () => {
    const decrypt = await build();
    mockDecrypt.mockImplementation(async () => {
      mockState.authentication.sessionEpoch++;
      return WRAPPER.toString('hex');
    });
    await expect(decrypt(descriptor(), context())).rejects.toThrow('Account changed');
    await expect(decrypt(descriptor(), context())).rejects.toThrow('Account changed');
    expect(mockDecrypt).toHaveBeenCalledTimes(1);
  });

  it('rejects empty optional fields on encrypted descriptors', async () => {
    const decrypt = await build();
    const encrypted = descriptor();
    encrypted.salt = Buffer.alloc(0);
    encrypted.flags = encrypted.flags.or(DataDescriptor.FLAG_SALT_PRESENT);
    await expect(decrypt(encrypted, context())).rejects.toThrow('empty optional');
    expect(mockDecrypt).not.toHaveBeenCalled();
  });

  it.each([2, 32, 64])('rejects authenticated plaintext with a present-but-empty field flag %i', async flag => {
    const decrypt = await build();
    // Raw descriptor: version 1, flag, empty objectdata, empty optional value.
    // Serialize the wrapper without normalizing the inner flags.
    const wrapped = new BufferDataVdxfObject(Buffer.from([1, flag, 0, 0]).toString('hex'),
      DataDescriptorKey.vdxfid).toBuffer();
    mockDecrypt.mockResolvedValue(wrapped.toString('hex'));
    const encrypted = descriptor();
    encrypted.objectdata = Buffer.alloc(wrapped.length + 16);
    await expect(decrypt(encrypted, context())).rejects.toThrow('empty optional');
  });
});

describe('supported local upload variants', () => {
  it('supports multiple content groups with exact recipient binding', async () => {
    const details = request(true);
    details.signDataMap.setByAddress(SYSTEM, [...details.signDataMap.entries()][0][1]);
    const decrypt = authenticate(details);
    await expect(decrypt(descriptor(true), context(true))).resolves.toEqual(WRAPPER);
    await expect(decrypt(descriptor(true), {...context(true), contentKey: SYSTEM})).resolves.toEqual(WRAPPER);
  });

  it.each(['address', 'signature'])('rejects signature uploads even with stale serialization flags (%s)', field => {
    const details = request();
    [...details.signDataMap.entries()][0][1][field] = field === 'address' ? {} : Buffer.from('signature');
    expect(() => assertSupportedIdentityUploads(details)).toThrow('embedded data signatures');
  });
});

describe('deep-link network and request expiry boundary', () => {
  const constraints = {systemId: SYSTEM, isTestnet: true, height: 100, chainId: SYSTEM};
  it('binds implicit root chain and rejects an endpoint on another chain', () => {
    expect(() => assertIdentityUpdateRequestConstraints(request(), constraints)).not.toThrow();
    expect(() => assertIdentityUpdateRequestConstraints(request(), {...constraints, chainId: 'another'}))
      .toThrow('different network');
    expect(() => assertIdentityUpdateRequestConstraints(request(), {...constraints, isTestnet: false}))
      .toThrow('different network');
  });
  it('checks expiry including a directly assigned value whose flags are stale', () => {
    const details = request();
    details.expiryHeight = {toNumber: () => 99};
    expect(() => assertIdentityUpdateRequestConstraints(details, constraints)).toThrow('expired');
    details.expiryHeight = {toNumber: () => 103};
    expect(() => assertIdentityUpdateRequestConstraints(details, constraints)).toThrow('four blocks');
    details.expiryHeight = {toNumber: () => 104};
    expect(() => assertIdentityUpdateRequestConstraints(details, constraints)).not.toThrow();
    expect(() => assertIdentityUpdateRequestConstraints(details, {...constraints, height: NaN}))
      .toThrow('network height');
  });
});
