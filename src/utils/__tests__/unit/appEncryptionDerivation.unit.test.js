import {BN} from 'bn.js';
import {
  AppEncryptionRequestDetails,
  AppEncryptionRequestOrdinalVDXFObject,
  AppEncryptionResponseDetails,
  CompactIAddressObject,
  DataDescriptor,
  DataResponseOrdinalVDXFObject,
  GenericRequest,
  IdentityID,
  SaplingPaymentAddress,
  VerifiableSignatureData,
} from 'verus-typescript-primitives';
import {SaplingExtendedSpendingKey} from 'verus-typescript-primitives/dist/pbaas/SaplingExtendedSpendingKey';
import {SaplingExtendedViewingKey} from 'verus-typescript-primitives/dist/pbaas/SaplingExtendedViewingKey';
import {processAppEncryptionRequest, handleAppEncryptionRequestVDXFObject} from '../../deeplink/handlers/appEncryptionRequestHandler';
import {getRequestScope} from '../../deeplink/handlers/requestDisplayUtils';
import {getKeyMaterial} from '../../crypto/getKeyMaterial';
import {zGetEncryptionAddress} from '../../api/channels/dlight/requests/zGetEncryptionAddress';
import {assertAppEncryptionAuthorization} from '../../deeplink/validator/appEncryptionAuthorization';
import {encryptDataBufferToDescriptor} from '../../crypto/encryptDataDescriptor';

let mockState;
jest.mock('../../../store', () => ({getState: () => mockState}));
jest.mock('../../vrpc/vrpcInterface', () => ({initEndpoint: jest.fn()}));
jest.mock('../../crypto/getKeyMaterial', () => ({
  ...jest.requireActual('../../crypto/getKeyMaterial'),
  getKeyMaterial: jest.fn(),
}));
jest.mock('../../api/channels/dlight/requests/zGetEncryptionAddress', () => ({zGetEncryptionAddress: jest.fn()}));
jest.mock('../../deeplink/validator/appEncryptionAuthorization', () => ({assertAppEncryptionAuthorization: jest.fn()}));
jest.mock('../../crypto/encryptDataDescriptor', () => ({encryptDataBufferToDescriptor: jest.fn()}));
jest.mock('../../api/channels/verusid/callCreators', () => ({getIdentity: jest.fn(async () => {throw new Error('Not registered');})}));
jest.mock('../../deeplink/handlers/requestDisplayUtils', () => ({
  ...jest.requireActual('../../deeplink/handlers/requestDisplayUtils'),
  getSignedRequestDisplayProps: jest.fn(async () => ({signerSystemID: 'system'})),
}));

const compact = name => CompactIAddressObject.fromFQN(`${name}@`, 'VRSC');
const user = compact('user').toIAddress();
const signer = compact('app');
const scope = compact('scope');
const nested = compact('unregistered');
const correlation = compact('correlation');
const idHex = address => IdentityID.fromAddress(address).hash.toString('hex');
const walletKey = '03'.repeat(169);
const keySet = byte => ({
  ivk: Buffer.alloc(32, byte).toString('hex'),
  extfvk: new SaplingExtendedViewingKey({ak: Buffer.alloc(32, byte)}).toKeyString(),
  address: new SaplingPaymentAddress({d: Buffer.alloc(11, byte), pkD: Buffer.alloc(32, byte)}).toAddressString(),
  spendingKey: new SaplingExtendedSpendingKey({ask: Buffer.alloc(32, byte)}).toKeyString(),
});
const baseKeys = keySet(1);
const finalKeys = keySet(2);
const recipient = SaplingPaymentAddress.fromAddressString(keySet(4).address);
const makeRequest = (details = {}, appScope) => new GenericRequest({
  signature: new VerifiableSignatureData({systemID: compact('VRSC'), identityID: signer}),
  appOrDelegatorID: appScope,
  details: [new AppEncryptionRequestOrdinalVDXFObject({data: new AppEncryptionRequestDetails({
    derivationNumber: new BN(7), requestID: correlation, encryptResponseToAddress: recipient, ...details,
  })})],
});
const process = (request, assertActive = () => {}) => processAppEncryptionRequest({
  request, detailIndex: 0, responseSignerID: user, responseSignerSystemID: 'selected-system', assertActive,
});

const decodedResponse = () => {
  expect(encryptDataBufferToDescriptor).toHaveBeenCalledTimes(1);
  const [encryptTo, plaintext] = encryptDataBufferToDescriptor.mock.calls[0];
  expect(encryptTo).toBe(recipient.toAddressString());
  const details = new AppEncryptionResponseDetails();
  expect(details.fromBuffer(plaintext)).toBe(plaintext.length);
  return details;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockState = {authentication: {activeAccount: {accountHash: 'profile'}, sessionEpoch: 1, signedIn: true}};
  getKeyMaterial.mockResolvedValue({extsk: walletKey});
  assertAppEncryptionAuthorization.mockImplementation(async request => ({
    coinObj: {id: 'VRSC', system_id: 'system'}, appScopeID: getRequestScope(request),
  }));
  zGetEncryptionAddress.mockResolvedValue(finalKeys);
  encryptDataBufferToDescriptor.mockResolvedValue({
    encryptedDescriptor: new DataDescriptor({
      flags: DataDescriptor.FLAG_ENCRYPTED_DATA, objectdata: Buffer.from('encrypted'),
    }),
    encryptedDescriptorJson: {objectdata: 'encrypted'},
  });
});

test('one-stage requests use the verified signer scope and return only requested keys', async () => {
  const request = makeRequest();
  const result = await process(request);
  expect(assertAppEncryptionAuthorization).toHaveBeenCalledWith(
    request, {identityID: user, systemID: 'selected-system'}, expect.any(Object),
  );
  expect(zGetEncryptionAddress).toHaveBeenCalledTimes(1);
  expect(zGetEncryptionAddress).toHaveBeenCalledWith('system', {
    extsk: walletKey, fromId: idHex(user), toId: idHex(signer.toIAddress()),
    hdIndex: -1, encryptionIndex: 7, returnSecret: false,
  });
  expect(result.responseDetail).toBeInstanceOf(DataResponseOrdinalVDXFObject);
  const details = decodedResponse();
  expect(details.address.toAddressString()).toBe(finalKeys.address);
  expect(details.containsExtendedSpendingKey()).toBe(false);
  expect(result.responseDetail.data.requestID.toIAddress()).toBe(correlation.toIAddress());
});

test.each([undefined, 19])('nested derivation uses intermediate raw bytes and secondary index %s', async secondary => {
  zGetEncryptionAddress.mockResolvedValueOnce(baseKeys).mockResolvedValueOnce(finalKeys);
  const result = await process(makeRequest({
    derivationID: nested,
    secondaryDerivationNumber: secondary === undefined ? undefined : new BN(secondary),
  }, scope));
  expect(zGetEncryptionAddress).toHaveBeenCalledTimes(2);
  expect(zGetEncryptionAddress.mock.calls[0][1]).toEqual({
    extsk: walletKey, fromId: idHex(user), toId: idHex(scope.toIAddress()),
    hdIndex: -1, encryptionIndex: 7, returnSecret: true,
  });
  expect(zGetEncryptionAddress.mock.calls[1][1]).toEqual({
    extsk: SaplingExtendedSpendingKey.fromKeyString(baseKeys.spendingKey).toBuffer().toString('hex'),
    fromId: idHex(user), toId: idHex(nested.toIAddress()),
    hdIndex: -1, encryptionIndex: secondary || 0, returnSecret: false,
  });
  expect(result.responseDetail).toBeInstanceOf(DataResponseOrdinalVDXFObject);
  const details = decodedResponse();
  expect(details.address.toAddressString()).toBe(finalKeys.address);
  expect(details.toJson().extendedspendingkey).toBeUndefined();
  expect(details.toBuffer().includes(SaplingExtendedSpendingKey.fromKeyString(baseKeys.spendingKey).toBuffer())).toBe(false);
});

test.each([false, true])('encrypted wrapper preserves correlation and final ESK permission %s', async returnESK => {
  zGetEncryptionAddress.mockResolvedValueOnce(baseKeys).mockResolvedValueOnce(finalKeys);
  const request = makeRequest({
    derivationID: nested,
    encryptResponseToAddress: recipient,
    flags: returnESK ? AppEncryptionRequestDetails.FLAG_RETURN_ESK : new BN(0),
  });
  const result = await process(request);
  expect(result.responseDetail).toBeInstanceOf(DataResponseOrdinalVDXFObject);
  expect(result.responseDetail.data.requestID.toIAddress()).toBe(correlation.toIAddress());
  const decoded = decodedResponse();
  expect(decoded.address.toAddressString()).toBe(finalKeys.address);
  expect(decoded.containsExtendedSpendingKey()).toBe(returnESK);
  if (returnESK) expect(decoded.extendedSpendingKey.toKeyString()).toBe(finalKeys.spendingKey);
  expect(zGetEncryptionAddress.mock.calls[1][1].returnSecret).toBe(returnESK);
});

test.each([false, true])('missing recipient rejects before key access (returnESK = %s)', async returnESK => {
  const request = makeRequest({
    encryptResponseToAddress: undefined,
    flags: returnESK ? AppEncryptionRequestDetails.FLAG_RETURN_ESK : new BN(0),
  });

  await expect(process(request)).rejects.toThrow('must specify encryptResponseToAddress');
  expect(assertAppEncryptionAuthorization).not.toHaveBeenCalled();
  expect(getKeyMaterial).not.toHaveBeenCalled();
  expect(zGetEncryptionAddress).not.toHaveBeenCalled();
  expect(encryptDataBufferToDescriptor).not.toHaveBeenCalled();
});

test('single-stage requests may return their final spending key when requested', async () => {
  const request = makeRequest({flags: AppEncryptionRequestDetails.FLAG_RETURN_ESK});

  await process(request);
  expect(zGetEncryptionAddress).toHaveBeenCalledTimes(1);
  expect(zGetEncryptionAddress.mock.calls[0][1].returnSecret).toBe(true);
  expect(decodedResponse().extendedSpendingKey.toKeyString()).toBe(finalKeys.spendingKey);
});

test('encryption failure aborts without a plaintext fallback', async () => {
  encryptDataBufferToDescriptor.mockRejectedValueOnce(new Error('Encryption failed'));
  await expect(process(makeRequest())).rejects.toThrow('Encryption failed');
});

test.each([null, {}, {...baseKeys, spendingKey: undefined}, {...baseKeys, spendingKey: 'invalid'}])('missing or malformed intermediate key aborts without a second call', async keys => {
  zGetEncryptionAddress.mockResolvedValueOnce(keys);
  await expect(process(makeRequest({derivationID: nested}))).rejects.toThrow('Unable to derive');
  expect(zGetEncryptionAddress).toHaveBeenCalledTimes(1);
  expect(encryptDataBufferToDescriptor).not.toHaveBeenCalled();
});

test.each([1, 2])('native stage %s failure aborts without exposing native error data', async stage => {
  if (stage === 2) zGetEncryptionAddress.mockResolvedValueOnce(baseKeys);
  zGetEncryptionAddress.mockRejectedValueOnce(new Error(baseKeys.spendingKey));
  await expect(process(makeRequest({derivationID: nested}))).rejects.toThrow('Unable to derive encryption channel keys.');
  expect(zGetEncryptionAddress).toHaveBeenCalledTimes(stage);
  expect(encryptDataBufferToDescriptor).not.toHaveBeenCalled();
});

test.each([
  {...finalKeys, ivk: 'xx'}, {...finalKeys, address: 'invalid'},
  {...finalKeys, extfvk: 'invalid'}, undefined,
])('invalid final keys do not produce a response', async keys => {
  zGetEncryptionAddress.mockResolvedValueOnce(keys);
  await expect(process(makeRequest())).rejects.toThrow();
});

test('authorization failures stop before shielded key access', async () => {
  assertAppEncryptionAuthorization.mockRejectedValueOnce(new Error('Not authorized'));
  await expect(process(makeRequest())).rejects.toThrow('Not authorized');
  expect(getKeyMaterial).not.toHaveBeenCalled();
  expect(zGetEncryptionAddress).not.toHaveBeenCalled();
});

test('malformed explicit scope never falls back to the signer', async () => {
  const request = makeRequest({}, compact('malformed'));
  request.appOrDelegatorID.toIAddress = () => {throw new Error('Malformed scope');};
  await expect(process(request)).rejects.toThrow('Malformed scope');
  expect(getKeyMaterial).not.toHaveBeenCalled();
});

test.each(['profile', 'network', 'epoch', 'request', 'identity'])('changing %s discards an in-flight derivation', async change => {
  const request = makeRequest({derivationID: nested});
  let selected = true;
  zGetEncryptionAddress.mockImplementationOnce(async () => {
    if (change === 'profile') mockState.authentication.activeAccount = {accountHash: 'other'};
    if (change === 'network') mockState.authentication.activeAccount.testnetOverrides = {VRSC: 'VRSCTEST'};
    if (change === 'epoch') mockState.authentication.sessionEpoch++;
    if (change === 'request') request.details[0].data.derivationNumber = new BN(8);
    if (change === 'identity') selected = false;
    return baseKeys;
  });
  await expect(process(request, () => {
    if (!selected) throw Object.assign(new Error('Selection changed'), {code: 'SESSION_CHANGED'});
  })).rejects.toMatchObject({code: 'SESSION_CHANGED'});
  expect(zGetEncryptionAddress).toHaveBeenCalledTimes(1);
});

test('profile change during shielded key access prevents native derivation', async () => {
  getKeyMaterial.mockImplementationOnce(async () => {
    mockState.authentication.sessionEpoch++;
    return {extsk: walletKey};
  });
  await expect(process(makeRequest())).rejects.toMatchObject({code: 'SESSION_CHANGED'});
  expect(zGetEncryptionAddress).not.toHaveBeenCalled();
});

test('request changes during response encryption discard the pending response', async () => {
  const request = makeRequest({encryptResponseToAddress: recipient});
  encryptDataBufferToDescriptor.mockImplementationOnce(async () => {
    request.details[0].data.derivationNumber = new BN(8);
    return {};
  });
  await expect(process(request)).rejects.toMatchObject({code: 'SESSION_CHANGED'});
});

test('display keeps raw app and nested IDs when name lookups fail', async () => {
  const {displayProps} = await handleAppEncryptionRequestVDXFObject(makeRequest({
    derivationID: nested, secondaryDerivationNumber: new BN(13),
  }, scope), null, 0);
  expect(displayProps).toMatchObject({
    appScopeID: scope.toIAddress(), appScopeFqn: scope.toIAddress(),
    derivationIdentityID: nested.toIAddress(), derivationIdFqn: nested.toIAddress(),
    derivationNumber: 7, secondaryDerivationNumber: 13,
  });
});
