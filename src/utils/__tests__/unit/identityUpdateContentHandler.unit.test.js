jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {initEndpoint: jest.fn()},
}));
jest.mock('../../api/channels/vrpc/requests/getBlock', () => ({getBlock: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/getSignatureInfo', () => ({getSignatureInfo: jest.fn()}));
jest.mock('../../api/channels/verusid/callCreators', () => ({
  getIdentity: jest.fn(),
  getFriendlyNameMap: jest.fn(async () => ({})),
}));
jest.mock('../../api/channels/verusid/requests/getIdentityContent', () => ({
  getIdentityContent: jest.fn(),
}));
jest.mock('../../api/channels/verusid/requests/updateIdentity', () => ({
  createUpdateIdentityTx: jest.fn(),
  getUpdatableIdentity: jest.fn(),
}));
jest.mock('../../api/channels/vrpc/callCreators', () => ({
  getInfo: jest.fn(async () => ({result: {longestchain: 100}})),
}));
jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: {getBasicCoinObj: () => ({
    system_id: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
    vrpc_endpoints: ['https://example.invalid'],
  })},
}));
jest.mock('../../CoinData/CoinData', () => ({getSystemNameFromSystemId: () => null}));

const {
  CompactIAddressObject,
  ContentMultiMapRemoveKey,
  DataStringKey,
  GenericResponse,
  Identity,
  IdentityUpdateRequestDetails,
  IdentityUpdateRequestOrdinalVDXFObject,
  toIAddress,
} = require('verus-typescript-primitives');
const {getIdentity} = require('../../api/channels/verusid/callCreators');
const {getIdentityContent} = require('../../api/channels/verusid/requests/getIdentityContent');
const {createUpdateIdentityTx, getUpdatableIdentity} = require('../../api/channels/verusid/requests/updateIdentity');
const {handleIdentityUpdateRequestDetailsVDXFObject} = require('../../deeplink/handlers/identityUpdateRequestDetailsHandler');

const SYSTEM_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const SUBJECT_ID = toIAddress('cmm-subject', 'VRSC');
const SIGNER_ID = toIAddress('cmm-requester', 'VRSC');
const KEY = DataStringKey.vdxfid;
const oldContent = {[KEY]: [{[KEY]: 'previously published'}]};
const newContent = {[KEY]: [{[KEY]: 'new value'}]};
let subjectIdentity;
let historyResponse;

const makeRequest = contentmultimap => {
  const details = IdentityUpdateRequestDetails.fromCLIJson({
    name: 'cmm-subject',
    parent: SYSTEM_ID,
    ...(contentmultimap === undefined ? {} : {contentmultimap}),
  });
  return {
    isTestnet: () => false,
    getDetails: () => new IdentityUpdateRequestOrdinalVDXFObject({data: details}),
    signature: {
      identityID: CompactIAddressObject.fromAddress(SIGNER_ID),
      systemID: CompactIAddressObject.fromAddress(SYSTEM_ID),
    },
  };
};

const prepareDelta = contentmultimap => {
  createUpdateIdentityTx.mockResolvedValue({
    identity: Identity.fromJson({...subjectIdentity.identity, contentmultimap}),
    hex: 'prepared-update-hex',
  });
};

const handleRequest = request => handleIdentityUpdateRequestDetailsVDXFObject(
  request,
  new GenericResponse(),
  0,
);

beforeEach(() => {
  jest.clearAllMocks();
  const identity = Identity.fromJson({
    version: 3,
    flags: 0,
    timelock: 0,
    name: 'cmm-subject',
    parent: SYSTEM_ID,
    systemid: SYSTEM_ID,
    minimumsignatures: 1,
    primaryaddresses: ['RTqQe58LSj2yr5CrwYFwcsAQ1edQwmrkUU'],
    recoveryauthority: SUBJECT_ID,
    revocationauthority: SUBJECT_ID,
    contentmap: {},
    contentmultimap: oldContent,
  });
  subjectIdentity = {
    identity: identity.toJson(),
    fullyqualifiedname: 'cmm-subject.VRSC@',
    blockheight: 42,
    txid: 'canonical-identity-txid',
    vout: 0,
  };
  historyResponse = {result: {
    blockheight: 99,
    txid: 'untrusted-history-metadata',
    identity: {...subjectIdentity.identity, flags: 32768, contentmultimap: oldContent},
  }};
  getIdentity.mockResolvedValue({result: subjectIdentity});
  getUpdatableIdentity.mockResolvedValue({identity, tx: 'canonical-identity-hex'});
  getIdentityContent.mockImplementation(async (_, address) => address === SUBJECT_ID
    ? historyResponse
    : {result: {identity: {identityaddress: SIGNER_ID, contentmultimap: {}}}});
  prepareDelta({});
});

describe('identity update content history for review', () => {
  it.each([
    ['omitted content', undefined],
    ['empty content map', {}],
    ['empty value list', {[KEY]: []}],
  ])('does not fetch subject history or copy old content for %s', async (_, content) => {
    const {displayProps} = await handleRequest(makeRequest(content));

    expect(getIdentityContent.mock.calls).toEqual([[SYSTEM_ID, SIGNER_ID]]);
    expect(displayProps.identityUpdates.contentmultimap).toEqual({});
    expect(displayProps.subjectIdentity).toEqual(subjectIdentity);
  });

  it('uses aggregate content for display without changing canonical identity or the appended delta', async () => {
    subjectIdentity.identity.contentmultimap = {};
    getUpdatableIdentity.mockResolvedValue({
      identity: Identity.fromJson(subjectIdentity.identity), tx: 'canonical-identity-hex',
    });
    prepareDelta(newContent);
    const request = makeRequest(newContent);
    const {displayProps} = await handleRequest(request);

    expect(getIdentityContent).toHaveBeenCalledWith(SYSTEM_ID, SUBJECT_ID, 0, 42);
    expect(getIdentityContent).toHaveBeenCalledWith(SYSTEM_ID, SIGNER_ID);
    expect(displayProps.subjectIdentity).toEqual({
      ...subjectIdentity,
      identity: {...subjectIdentity.identity, contentmultimap: oldContent},
    });
    expect(displayProps.identityUpdates.contentmultimap).toEqual(newContent);
    expect(subjectIdentity.identity.contentmultimap).toEqual({});
    expect(getUpdatableIdentity).toHaveBeenCalledWith(SYSTEM_ID, subjectIdentity);
    expect(createUpdateIdentityTx).toHaveBeenCalledWith(
      SYSTEM_ID, request.getDetails().data, SUBJECT_ID, 'canonical-identity-hex',
      42, false, undefined, false,
    );
    expect(displayProps.subjectIdTxHex).toBe('canonical-identity-hex');
  });

  it('preserves the explicit remove-key operation separately from current content', async () => {
    const removal = {[ContentMultiMapRemoveKey.vdxfid]: [{
      [ContentMultiMapRemoveKey.vdxfid]: {version: 1, action: 3, entrykey: KEY},
    }]};
    prepareDelta(removal);
    const {displayProps} = await handleRequest(makeRequest(removal));

    expect(getIdentityContent).toHaveBeenCalledWith(SYSTEM_ID, SUBJECT_ID, 0, 42);
    expect(displayProps.subjectIdentity.identity.contentmultimap).toEqual(oldContent);
    expect(displayProps.identityUpdates.contentmultimap).toEqual(removal);
  });

  it('fetches current content for sign-data additions even without ordinary CMM values', async () => {
    prepareDelta(newContent);
    const request = makeRequest({[KEY]: {data: {message: 'new signed value'}}});
    expect(request.getDetails().data.containsSignData()).toBe(true);
    const {displayProps} = await handleRequest(request);

    expect(getIdentityContent).toHaveBeenCalledWith(SYSTEM_ID, SUBJECT_ID, 0, 42);
    expect(displayProps.subjectIdentity.identity.contentmultimap).toEqual(oldContent);
    expect(displayProps.identityUpdates.contentmultimap).toEqual(newContent);
  });

  it('propagates a subject history error instead of displaying an empty before-state', async () => {
    historyResponse = {error: {message: 'Identity history unavailable'}};

    await expect(handleRequest(makeRequest(newContent))).rejects.toThrow('Identity history unavailable');
  });

  it('rejects history belonging to another identity', async () => {
    historyResponse.result.identity.identityaddress = SIGNER_ID;

    await expect(handleRequest(makeRequest(newContent))).rejects.toThrow(
      'Identity content does not match the identity being updated',
    );
  });
});
