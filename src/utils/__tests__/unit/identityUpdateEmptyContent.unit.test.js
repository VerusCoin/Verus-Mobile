const mockCreateUpdateIdentityTransaction = jest.fn();

jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {
    getVerusIdInterface: () => ({createUpdateIdentityTransaction: mockCreateUpdateIdentityTransaction}),
  },
}));
jest.mock('../../api/channels/vrpc/callCreators', () => ({
  getSpendableUtxos: jest.fn().mockResolvedValue([]),
  getTransaction: jest.fn(),
  sendRawTransaction: jest.fn(),
}));
jest.mock('../../api/channels/verusid/requests/getIdentity', () => ({getIdentity: jest.fn()}));
jest.mock('../../constants/constants', () => ({I_ADDRESS_VERSION: 102}));

const {
  BigNumber,
  CompactIAddressObject,
  ContentMultiMapRemoveKey,
  DataStringKey,
  Identity,
  IdentityID,
  IdentityUpdateRequestDetails,
  PartialIdentity,
} = require('verus-typescript-primitives');
const {VerusIdInterface} = require('verusid-ts-client');
const {networks, smarttxs} = require('@bitgo/utxo-lib');
const {createUpdateIdentityTx} = require('../../api/channels/verusid/requests/updateIdentity');

const SYSTEM_ID = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const EMPTY_KEY = 'iJitWFN8PY37GrBVtF38HyftG8WohWipbL';
const makeRequest = contentmultimap => new IdentityUpdateRequestDetails({
  identity: PartialIdentity.fromJson({name: 'T1', contentmultimap}),
  requestID: CompactIAddressObject.fromAddress(EMPTY_KEY, 'VRSCTEST'),
  systemID: IdentityID.fromAddress(SYSTEM_ID),
  expiryHeight: new BigNumber(900),
  txid: Buffer.alloc(32, 1),
});
const prepare = request => createUpdateIdentityTx(
  SYSTEM_ID, request, 'change-address', 'identity-tx', 100, false, 'prepared-tx', true,
);

describe('identity update content normalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateUpdateIdentityTransaction.mockResolvedValue({hex: 'result'});
  });

  it('passes a normalized copy while preserving the original request bytes and explicit map presence', async () => {
    const request = makeRequest({[EMPTY_KEY]: []});
    const originalBytes = request.toBuffer();
    const result = await prepare(request);
    const normalized = mockCreateUpdateIdentityTransaction.mock.calls[0][0];

    expect(result).toEqual({hex: 'result'});
    expect(normalized).not.toBe(request);
    expect(normalized.identity.containsContentMultiMap()).toBe(true);
    expect(normalized.toCLIJson().contentmultimap).toEqual({});
    expect(normalized.requestID.rootSystemName).toBe('VRSCTEST');
    expect(normalized.toJson()).toEqual({
      ...request.toJson(), identity: {...request.identity.toJson(), contentmultimap: {}},
    });
    expect(request.toBuffer()).toEqual(originalBytes);
    expect(request.toCLIJson().contentmultimap).toEqual({[EMPTY_KEY]: []});
    expect(mockCreateUpdateIdentityTransaction.mock.calls[0].slice(1)).toEqual([
      'change-address', 'identity-tx', 100, undefined, undefined, undefined,
      undefined, undefined, 'prepared-tx', true, true,
    ]);
  });

  it('retains actual additions and explicit removal operations when dropping an empty key', async () => {
    const contentmultimap = {
      [EMPTY_KEY]: [],
      [SYSTEM_ID]: [{[DataStringKey.vdxfid]: 'retained value'}],
      [ContentMultiMapRemoveKey.vdxfid]: [{
        [ContentMultiMapRemoveKey.vdxfid]: {version: 1, action: 3, entrykey: SYSTEM_ID},
      }],
    };
    const request = makeRequest(contentmultimap);
    const originalBytes = request.toBuffer();
    const expectedContent = {...request.toCLIJson().contentmultimap};
    delete expectedContent[EMPTY_KEY];

    await prepare(request);
    const normalized = mockCreateUpdateIdentityTransaction.mock.calls[0][0];
    expect(normalized.toCLIJson().contentmultimap).toEqual(expectedContent);
    for (const key of [SYSTEM_ID, ContentMultiMapRemoveKey.vdxfid]) {
      expect(normalized.identity.contentMultiMap.kvContent.getByAddress(key)[0].toBuffer())
        .toEqual(request.identity.contentMultiMap.kvContent.getByAddress(key)[0].toBuffer());
    }
    expect(request.toBuffer()).toEqual(originalBytes);
  });

  it.each([undefined, {}])('preserves omitted or explicitly empty maps without cloning: %s', contentmultimap => {
    const request = makeRequest(contentmultimap);
    const originalBytes = request.toBuffer();
    return prepare(request).then(() => {
      const passed = mockCreateUpdateIdentityTransaction.mock.calls[0][0];
      expect(passed).toBe(request);
      expect(passed.identity.containsContentMultiMap()).toBe(contentmultimap !== undefined);
      expect(passed.toCLIJson().contentmultimap).toEqual(contentmultimap);
      expect(request.toBuffer()).toEqual(originalBytes);
    });
  });

  it('accepts daemon key ordering through the real client while still rejecting value changes', async () => {
    const key = DataStringKey.vdxfid;
    const removeKey = ContentMultiMapRemoveKey.vdxfid;
    const additions = [{[key]: 'second'}, {[key]: 'first'}, {[key]: 'second'}];
    const removals = [1, 2].map(action => ({[removeKey]: {
      version: 1, action, entrykey: key, valuehash: 'ab'.repeat(32),
    }}));
    const request = new IdentityUpdateRequestDetails({
      identity: PartialIdentity.fromJson({
        name: 'T1', parent: SYSTEM_ID,
        contentmultimap: {[key]: additions, [removeKey]: removals},
      }),
    });
    const originalBytes = request.toBuffer();
    const currentIdentity = {
      version: 3, flags: 0, name: 'T1', parent: SYSTEM_ID, systemid: SYSTEM_ID,
      primaryaddresses: ['RWCqoWfSKaDoGeiwD6ZxX2dwkMx2oHJM56'], minimumsignatures: 1,
      revocationauthority: EMPTY_KEY, recoveryauthority: EMPTY_KEY,
      contentmap: {}, contentmultimap: {}, timelock: 0,
    };
    const transaction = contentmultimap => smarttxs.createUnfundedIdentityUpdate(
      Identity.fromJson({...currentIdentity, contentmultimap}).toBuffer().toString('hex'),
      networks.verus, 120,
    );
    const originalTx = transaction({});
    const serverTx = transaction({[removeKey]: removals, [key]: additions});
    const client = new VerusIdInterface('VRSCTEST', 'https://example.invalid');
    const validate = (details, tx = serverTx) => client.prepareIdentityUpdateTransaction(
      details, originalTx, 100, tx, true, true,
    );

    await expect(validate(request)).rejects.toThrow('changes do not appear to match');
    mockCreateUpdateIdentityTransaction.mockImplementation(details => validate(details));
    await expect(prepare(request)).resolves.toHaveProperty('identityOnOutput');
    const normalized = mockCreateUpdateIdentityTransaction.mock.calls[0][0];
    expect(Object.keys(normalized.identity.toJson().contentmultimap)).toEqual([removeKey, key]);
    expect(normalized.identity.toJson().contentmultimap[key]).toEqual(additions);
    expect(normalized.identity.toJson().contentmultimap[removeKey]).toEqual(removals);
    expect(request.toBuffer()).toEqual(originalBytes);

    for (const changed of [
      {[removeKey]: removals, [key]: [additions[1], additions[0], additions[2]]},
      {[removeKey]: removals, [key]: additions.slice(1)},
      {[removeKey]: [...removals].reverse(), [key]: additions},
      {[removeKey]: removals, [key]: [{[key]: 'different value'}]},
    ]) {
      await expect(validate(normalized, transaction(changed)))
        .rejects.toThrow('changes do not appear to match');
    }
  });
});
