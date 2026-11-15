const mockClient = {
  createUpdateIdentityTransaction: jest.fn(),
  createUpdateIdentityWithCurrencyTransferTransaction: jest.fn(),
  signUpdateIdentityTransaction: jest.fn(),
};
const mockVerify = jest.fn();
jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true, default: {getVerusIdInterface: jest.fn(() => mockClient)},
}));
jest.mock('verusid-ts-client', () => ({
  ...jest.requireActual('verusid-ts-client'),
  verifyIdentityUpdateFunding: (...args) => mockVerify(...args),
}));
jest.mock('../../api/channels/vrpc/callCreators', () => ({
  getSpendableUtxos: jest.fn(async () => []), getTransaction: jest.fn(), sendRawTransaction: jest.fn(),
}));
jest.mock('../../api/channels/verusid/requests/getIdentity', () => ({getIdentity: jest.fn()}));

const {VerusIdInterface} = require('verusid-ts-client');
const {
  createUpdateIdentityTx, createUpdateIdentityTxWithUtxos,
  createUpdateIdentityWithCurrencyTransferTx, signUpdateIdentityTx,
} = require('../../api/channels/verusid/requests/updateIdentity');
const {getSpendableUtxos} = require('../../api/channels/vrpc/callCreators');
const SYSTEM = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';

beforeEach(() => {
  jest.clearAllMocks();
  mockVerify.mockReturnValue(true);
  mockClient.signUpdateIdentityTransaction.mockReturnValue('signed');
});

test.each([true, false])('plain update forwards explicit chain and operation crypto for funded=%p', async funded => {
  const request = {upload: true};
  const decryptData = jest.fn();
  const localUploadCrypto = {decryptData, encrypt: jest.fn(), randomBytes: jest.fn()};
  await createUpdateIdentityTx(SYSTEM, request, 'change', 'source', 10, funded, true, localUploadCrypto, 20);
  expect(getSpendableUtxos).toHaveBeenCalledTimes(funded ? 1 : 0);
  expect(mockClient.createUpdateIdentityTransaction).toHaveBeenCalledWith(
    request, 'change', 'source', 10, funded ? [] : undefined, SYSTEM,
    undefined, undefined, 20, undefined, true, true, false, decryptData, localUploadCrypto,
  );
});

test('explicit-input update forwards cap in coins and never permits unverified prevouts', async () => {
  const decryptData = jest.fn();
  const localUploadCrypto = {decryptData, encrypt: jest.fn(), randomBytes: jest.fn()};
  const inputs = [{txid: 'first'}, {txid: 'second'}];
  await createUpdateIdentityTxWithUtxos({systemId: SYSTEM, identity: 'request', changeAaddr: 'change',
    rawIdTx: 'source', idHeight: 10, utxos: inputs, maxFee: 0.002, currentHeight: 20,
    fundRawTransactionResult: 'funded', isTestnet: true,
    allowUnverifiedPrevouts: true, localUploadCrypto});
  expect(mockClient.createUpdateIdentityTransaction).toHaveBeenCalledWith(
    'request', 'change', 'source', 10, inputs, SYSTEM, 0.002, 'funded', 20, undefined, true, true, false, decryptData, localUploadCrypto,
  );
});

test('combined transfer forwards ordered ownership policy and upload verifier', async () => {
  const decryptData = jest.fn();
  const localUploadCrypto = {decryptData, encrypt: jest.fn(), randomBytes: jest.fn()};
  const primaryAddresses = ['first-owner', 'second-owner'];
  await createUpdateIdentityWithCurrencyTransferTx({systemId: SYSTEM, identity: 'request', changeAaddr: 'change',
    rawIdTx: 'source', idHeight: 10, utxos: [], currencyTransferOutputs: ['payment'], localUploadCrypto,
    expectedIdentityPrimaryAddresses: primaryAddresses, expectedIdentityMinimumSignatures: 2});
  const options = mockClient.createUpdateIdentityWithCurrencyTransferTransaction.mock.calls[0][6];
  expect(options).toEqual(expect.objectContaining({chainIAddr: SYSTEM, decryptData, localUploadCrypto,
    expectedIdentityPrimaryAddresses: primaryAddresses, expectedIdentityMinimumSignatures: 2}));
  expect(options.allowUnverifiedPrevouts).not.toBe(true);
});

test.each([
  ['plain', identity => createUpdateIdentityTx(SYSTEM, identity, 'change', 'source', 10)],
  ['explicit inputs', identity => createUpdateIdentityTxWithUtxos({systemId: SYSTEM, identity, utxos: []})],
  ['combined transfer', identity => createUpdateIdentityWithCurrencyTransferTx({systemId: SYSTEM, identity, utxos: []})],
])('%s rejects unresolved upload variants before any funding work', async (_description, build) => {
  for (const signDataMap of [new Map([['first', {address: 'signer'}]])]) {
    await expect(build({signDataMap})).rejects.toThrow(/embedded data signatures/);
  }
  expect(getSpendableUtxos).not.toHaveBeenCalled();
  expect(mockClient.createUpdateIdentityTransaction).not.toHaveBeenCalled();
  expect(mockClient.createUpdateIdentityWithCurrencyTransferTransaction).not.toHaveBeenCalled();
});

test.each([undefined, {systemId: 'wrong-chain'}])('rejects missing or wrong-chain funding approval before signing (%p)', approval => {
  expect(() => signUpdateIdentityTx(SYSTEM, 'unsigned', [], [], approval)).toThrow(/approval|chain/i);
  expect(mockClient.signUpdateIdentityTransaction).not.toHaveBeenCalled();
});

test('retains the original approval and ordered signing inputs through verification and signing', () => {
  const approval = Object.freeze({systemId: SYSTEM});
  const inputs = Object.freeze([{txid: 'identity'}, {txid: 'funding'}]);
  const keys = [['identity-key'], ['funding-key']];
  const lockContext = {chainId: SYSTEM, nextBlockHeight: 21};
  expect(signUpdateIdentityTx(SYSTEM, 'unsigned', inputs, keys, approval, lockContext)).toBe('signed');
  expect(mockClient.signUpdateIdentityTransaction).toHaveBeenCalledWith('unsigned', inputs, keys, approval, lockContext);
  expect(mockVerify.mock.calls).toEqual([[approval, 'unsigned', inputs, lockContext], [approval, 'signed', inputs, lockContext]]);
});

test('stops before signing if funding verification rejects the candidate', () => {
  mockVerify.mockImplementationOnce(() => {throw new Error('Unexpected change');});
  expect(() => signUpdateIdentityTx(SYSTEM, 'tampered', [], [], {systemId: SYSTEM})).toThrow('Unexpected change');
  expect(mockClient.signUpdateIdentityTransaction).not.toHaveBeenCalled();
});

test('the real SDK retains a configured chain address without resolving it through a server', async () => {
  const rpc = jest.fn(async () => ({result: {currencyid: 'wrong-chain'}, error: null}));
  const client = new VerusIdInterface(SYSTEM, 'https://offline.invalid', undefined, rpc);
  await expect(client.getChainId()).resolves.toBe(SYSTEM);
  expect(rpc).not.toHaveBeenCalled();
});

test('the wallet and SDK load the same primitive classes', () => {
  const {createRequire} = require('module');
  const sdkRequire = createRequire(require.resolve('verusid-ts-client'));
  const primitives = require('verus-typescript-primitives');
  expect(sdkRequire('verus-typescript-primitives').Identity).toBe(primitives.Identity);
  expect(sdkRequire('verus-typescript-primitives').PartialSignData).toBe(primitives.PartialSignData);
});
