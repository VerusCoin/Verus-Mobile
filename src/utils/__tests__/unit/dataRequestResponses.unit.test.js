const mockRequestPrivKey = jest.fn();
const mockInitEndpoint = jest.fn();
const mockSignHash = jest.fn();

jest.mock('../../auth/authBox', () => ({
  requestPrivKey: mockRequestPrivKey,
}));

jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {
    initEndpoint: mockInitEndpoint,
    getVerusIdInterface: () => ({
      signHash: mockSignHash,
    }),
  },
}));

const {
  CompactAddressObject,
  Credential,
  CredentialKey,
  DATA_TYPE_OBJECT_CREDENTIAL,
  DataDescriptor,
  DataPacketRequestDetails,
  DataPacketRequestOrdinalVDXFObject,
  DataResponseOrdinalVDXFObject,
  GenericRequest,
  GenericResponse,
  SignatureDataKey,
  UserDataRequestDetails,
  VdxfUniValue,
} = require('verus-typescript-primitives');
const {buildUserDataResponse} = require('../../deeplink/userData/buildUserDataResponse');
const {buildDataPacketResponse} = require('../../deeplink/dataPacket/signDataPacket');
const {prepareGenericResponseForSigning} = require('../../deeplink/genericResponse/prepareGenericResponseForSigning');

const SYSTEM_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const IDENTITY_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';

describe('generic data request response builders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestPrivKey.mockResolvedValue('primary-wif');
    mockSignHash.mockResolvedValue(Buffer.from('signature').toString('base64'));
  });

  it('packages credentials in a DataResponseDetails ordinal', () => {
    const credential = new Credential({
      version: Credential.VERSION_CURRENT,
      credentialKey: 'iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj',
      credential: ['username', 'password'],
      scopes: [IDENTITY_ID],
    });
    const requestDetail = new UserDataRequestDetails({
      searchDataKey: [{[credential.credentialKey]: 'Plain Login'}],
      dataType: UserDataRequestDetails.FULL_DATA,
      requestType: UserDataRequestDetails.CREDENTIAL,
      requestID: CompactAddressObject.fromIAddress(IDENTITY_ID),
    });

    const response = buildUserDataResponse({
      userDataDetail: requestDetail,
      credentials: [credential],
    });

    expect(response).toBeInstanceOf(DataResponseOrdinalVDXFObject);
    expect(response.data.requestID.toIAddress()).toBe(IDENTITY_ID);

    const value = new VdxfUniValue();
    value.fromBuffer(response.data.data.objectdata);
    expect(value.values[0][DATA_TYPE_OBJECT_CREDENTIAL.vdxfid]).toBeInstanceOf(Credential);
  });

  it('returns null for empty credential responses', () => {
    const requestDetail = new UserDataRequestDetails({
      searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: 'Plain Login'}],
      dataType: UserDataRequestDetails.FULL_DATA,
      requestType: UserDataRequestDetails.CREDENTIAL,
    });

    expect(buildUserDataResponse({userDataDetail: requestDetail, credentials: []})).toBeNull();
  });

  it('packages data packet signatures in a DataResponseDetails ordinal', async () => {
    const requestDetail = new DataPacketRequestDetails({
      signableObjects: [
        'message',
        new DataDescriptor({objectdata: Buffer.from('descriptor')}),
      ],
      requestID: CompactAddressObject.fromIAddress(IDENTITY_ID),
    });

    const response = await buildDataPacketResponse({
      coinObj: {
        id: 'VRSC',
        system_id: SYSTEM_ID,
        vrpc_endpoints: ['https://example.invalid'],
      },
      identityAddress: IDENTITY_ID,
      dataPacketDetail: requestDetail,
    });

    expect(mockRequestPrivKey).toHaveBeenCalledTimes(2);
    expect(mockSignHash).toHaveBeenCalledTimes(2);
    expect(response).toBeInstanceOf(DataResponseOrdinalVDXFObject);

    const value = new VdxfUniValue();
    value.fromBuffer(response.data.data.objectdata);
    expect(value.values).toHaveLength(2);
    expect(value.values[0][SignatureDataKey.vdxfid]).toBeTruthy();
  });

  it('stamps top-level request id and hash before signing', () => {
    const request = new GenericRequest({
      requestID: CompactAddressObject.fromIAddress(IDENTITY_ID),
      details: [
        new DataPacketRequestOrdinalVDXFObject({
          data: new DataPacketRequestDetails({
            signableObjects: ['message'],
          }),
        }),
      ],
    });
    const response = new GenericResponse();

    prepareGenericResponseForSigning({
      request,
      response,
      handledBy: 123,
      createdAtSeconds: '100',
    });

    expect(response.requestID.toIAddress()).toBe(IDENTITY_ID);
    expect(response.requestHash.equals(request.getRawDataSha256())).toBe(true);
    expect(response.requestHashType.toNumber()).toBe(5);
    expect(response.createdAt.toString()).toBe('100');
    expect(response.handledBy).toBe(123);
    expect(response.hasRequestHash()).toBe(true);
  });
});
