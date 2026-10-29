const mockEncrypt = jest.fn();
jest.mock('react-native-verus', () => ({Tools: {encryptVerusData: mockEncrypt}}));

const {DataDescriptor, DataDescriptorKey, VDXFDataDescriptor} = require('verus-typescript-primitives');
const {encryptDataBufferToDescriptor} = require('../../crypto/encryptDataDescriptor');
const address = 'synthetic-recipient';
const payload = Buffer.from('ff0080fe', 'hex');
const wrapped = new VDXFDataDescriptor(new DataDescriptor({objectdata: payload}), DataDescriptorKey.vdxfid).toBuffer();
const response = () => ({ephemeralPublicKey: '23'.repeat(32), encryptedData: '34'.repeat(wrapped.length + 16)});

beforeEach(() => { mockEncrypt.mockReset().mockResolvedValue(response()); });

it('uses the native object contract and encrypts the complete wrapper without requesting an SSK', async () => {
  const result = await encryptDataBufferToDescriptor(address, payload);
  expect(mockEncrypt).toHaveBeenCalledWith(address, wrapped.toString('hex'), false);
  expect(result.encryptedDescriptor.objectdata.toString('hex')).toBe(response().encryptedData);
  expect(result.encryptedDescriptor.epk.toString('hex')).toBe(response().ephemeralPublicKey);
  expect(result.encryptedDescriptor.ssk).toBeUndefined();
  expect(result.encryptedDescriptorJson).toEqual({version: 1, flags: 5,
    objectdata: response().encryptedData, epk: response().ephemeralPublicKey});
});

it.each([
  ['ciphertext string', value => value.encryptedData],
  ['incorrect field name', value => ({ephemeralPublicKey: value.ephemeralPublicKey, dataToDecrypt: value.encryptedData})],
  ['invalid EPK length', value => ({...value, ephemeralPublicKey: '23'.repeat(31)})],
  ['invalid ciphertext length', value => ({...value, encryptedData: value.encryptedData.slice(2)})],
  ['nonhex ciphertext', value => ({...value, encryptedData: `zz${value.encryptedData.slice(2)}`})],
])('rejects %s before constructing a descriptor', async (_, invalid) => {
  mockEncrypt.mockResolvedValue(invalid(response()));
  await expect(encryptDataBufferToDescriptor(address, payload)).rejects.toThrow('Invalid native encrypted descriptor response');
});
