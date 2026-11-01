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
  KvMap,
  PartialIdentity,
  PartialSignData,
  SaplingPaymentAddress,
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
  SYSTEM_ID, request, 'change-address', 'identity-tx', 100, false, true,
);

describe('identity update SDK content normalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateUpdateIdentityTransaction.mockResolvedValue({hex: 'result'});
  });

  it('passes the complete original request to the SDK without a lossy serialization roundtrip', async () => {
    const request = makeRequest({[EMPTY_KEY]: []});
    const originalBytes = request.toBuffer();
    const result = await prepare(request);
    const normalized = mockCreateUpdateIdentityTransaction.mock.calls[0][0];

    expect(result).toEqual({hex: 'result'});
    expect(normalized).toBe(request);
    expect(normalized.identity.containsContentMultiMap()).toBe(true);
    expect(normalized.toCLIJson().contentmultimap).toEqual({[EMPTY_KEY]: []});
    expect(normalized.requestID.rootSystemName).toBe('VRSCTEST');
    expect(normalized.toJson()).toEqual(request.toJson());
    expect(request.toBuffer()).toEqual(originalBytes);
    expect(request.toCLIJson().contentmultimap).toEqual({[EMPTY_KEY]: []});
    expect(mockCreateUpdateIdentityTransaction.mock.calls[0].slice(1)).toEqual([
      'change-address', 'identity-tx', 100, undefined, SYSTEM_ID, undefined,
      undefined, undefined, undefined, true, true, false, undefined, undefined,
    ]);
  });

  it('preserves additions, removals and empty keys until the SDK snapshots them', async () => {
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

    await prepare(request);
    const normalized = mockCreateUpdateIdentityTransaction.mock.calls[0][0];
    expect(normalized.toCLIJson().contentmultimap).toEqual(expectedContent);
    for (const key of [SYSTEM_ID, ContentMultiMapRemoveKey.vdxfid]) {
      expect(normalized.identity.contentMultiMap.kvContent.getByAddress(key)[0].toBuffer())
        .toEqual(request.identity.contentMultiMap.kvContent.getByAddress(key)[0].toBuffer());
    }
    expect(request.toBuffer()).toEqual(originalBytes);
  });

  it('retains a directly assigned private upload recipient even when its serialization flag is unset', async () => {
    const request = makeRequest({[EMPTY_KEY]: []});
    const upload = PartialSignData.fromCLIJson({message: 'Private upload'});
    upload.encryptToAddress = SaplingPaymentAddress.fromAddressString(
      'zs1wczplx4kegw32h8g0f7xwl57p5tvnprwdmnzmdnsw50chcl26f7tws92wk2ap03ykaq6jyyztfa',
    );
    request.signDataMap = new KvMap();
    request.signDataMap.setByAddress(EMPTY_KEY, upload);
    request.toggleContainsSignData();
    expect(upload.flags.and(PartialSignData.CONTAINS_ENCRYPTTOADDRESS).isZero()).toBe(true);

    await prepare(request);
    const forwarded = mockCreateUpdateIdentityTransaction.mock.calls[0][0];
    expect(forwarded.signDataMap.getByAddress(EMPTY_KEY)).toBe(upload);
    expect(forwarded.signDataMap.getByAddress(EMPTY_KEY).encryptToAddress).toBe(upload.encryptToAddress);
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
    const client = new VerusIdInterface(SYSTEM_ID, 'https://example.invalid');
    const validate = (details, tx = serverTx) => client.prepareIdentityUpdateTransaction(
      details, originalTx, 100, tx, true, true,
    );

    // The SDK also canonicalizes outer map keys, while preserving the order
    // and exact contents of the operations stored under each key.
    const directlyPrepared = await validate(request);
    expect(Object.keys(directlyPrepared.identityOnOutput.toJson().contentmultimap)).toEqual([removeKey, key]);
    mockCreateUpdateIdentityTransaction.mockImplementation(details => validate(details));
    await expect(prepare(request)).resolves.toHaveProperty('identityOnOutput');
    const normalized = mockCreateUpdateIdentityTransaction.mock.calls[0][0];
    expect(normalized).toBe(request);
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
        .rejects.toThrow('Unexpected contentmultimap entries');
    }
  });
});
