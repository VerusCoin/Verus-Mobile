const mockRequestPrivKey = jest.fn();
const mockInitEndpoint = jest.fn();
const mockSignHash = jest.fn();
const mockEncryptData = jest.fn();

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

jest.mock('../../api/channels/dlight/requests/encrypt', () => ({
  encryptData: mockEncryptData,
}));

const {
  CompactAddressObject,
  Credential,
  CredentialKey,
  DATA_TYPE_OBJECT_CREDENTIAL,
  DataDescriptor,
  DataDescriptorKey,
  DataDescriptorOrdinalVDXFObject,
  DataPacketRequestDetails,
  DataPacketRequestOrdinalVDXFObject,
  DataResponseOrdinalVDXFObject,
  GenericRequest,
  GenericResponse,
  SignatureDataKey,
  UserDataRequestDetails,
  VdxfUniValue,
} = require('verus-typescript-primitives');
const createHash = require('create-hash');
const {buildUserDataResponse} = require('../../deeplink/userData/buildUserDataResponse');
const {buildDataPacketResponse} = require('../../deeplink/dataPacket/signDataPacket');
const {prepareGenericResponseForSigning} = require('../../deeplink/genericResponse/prepareGenericResponseForSigning');
const {encryptGenericResponseDetails} = require('../../deeplink/genericResponse/encryptGenericResponseDetails');

const SYSTEM_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const IDENTITY_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';

describe('generic data request response builders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestPrivKey.mockResolvedValue('primary-wif');
    mockSignHash.mockResolvedValue(Buffer.from('signature').toString('base64'));
    mockEncryptData.mockResolvedValue({
      encryptedData: 'abcd',
      ephemeralPublicKey: '11'.repeat(32),
    });
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
      statements: ['I agree to the statement'],
      requestID: CompactAddressObject.fromIAddress(IDENTITY_ID),
    });
    const descriptor = requestDetail.signableObjects[1];

    const response = await buildDataPacketResponse({
      coinObj: {
        id: 'VRSC',
        system_id: SYSTEM_ID,
        vrpc_endpoints: ['https://example.invalid'],
      },
      identityAddress: IDENTITY_ID,
      dataPacketDetail: requestDetail,
    });

    expect(mockRequestPrivKey).toHaveBeenCalledTimes(3);
    expect(mockSignHash).toHaveBeenCalledTimes(3);
    expect(mockSignHash.mock.calls[1][1].toString('hex')).toBe(
      createHash('sha256').update(descriptor.toBuffer()).digest('hex'),
    );
    expect(mockSignHash.mock.calls[2][1].toString('hex')).toBe(
      createHash('sha256').update(Buffer.from('I agree to the statement', 'utf8')).digest('hex'),
    );
    expect(response).toBeInstanceOf(DataResponseOrdinalVDXFObject);

    const value = new VdxfUniValue();
    value.fromBuffer(response.data.data.objectdata);
    expect(value.values).toHaveLength(3);
    expect(value.values[0][SignatureDataKey.vdxfid]).toBeTruthy();
  });

  it('encrypts complete generic response details when requested', async () => {
    const detailA = buildUserDataResponse({
      userDataDetail: new UserDataRequestDetails({
        searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: 'Plain Login'}],
        dataType: UserDataRequestDetails.FULL_DATA,
        requestType: UserDataRequestDetails.CREDENTIAL,
      }),
      credentials: [
        new Credential({
          version: Credential.VERSION_CURRENT,
          credentialKey: 'iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj',
          credential: ['username', 'password'],
          scopes: [IDENTITY_ID],
        }),
      ],
    });
    const detailB = new DataPacketRequestOrdinalVDXFObject({
      data: new DataPacketRequestDetails({
        signableObjects: ['message'],
      }),
    });
    const expectedPlaintextResponse = new GenericResponse({details: [detailA, detailB]});
    const plaintextDetailsBuffer = expectedPlaintextResponse.getDetailsBuffer();
    const wrappedPlaintext = new VdxfUniValue({
      values: [
        {
          [DataDescriptorKey.vdxfid]: new DataDescriptor({
            objectdata: plaintextDetailsBuffer,
          }),
        },
      ],
    }).toBuffer().toString('hex');
    const response = new GenericResponse();
    response.details = [detailA, detailB];
    const request = {
      hasEncryptResponseToAddress: () => true,
      encryptResponseToAddress: {
        toAddressString: () => 'zs1exampleencryptedresponseaddress',
      },
    };

    await encryptGenericResponseDetails({request, response});

    expect(mockEncryptData).toHaveBeenCalledWith(
      'zs1exampleencryptedresponseaddress',
      wrappedPlaintext,
      true,
    );
    expect(response.detailsAreEncrypted()).toBe(true);
    expect(response.hasMultiDetails()).toBe(true);
    expect(response.details).toHaveLength(1);
    expect(response.getDetails(0)).toBeInstanceOf(DataDescriptorOrdinalVDXFObject);
    expect(response.getDetails(0).data.objectdata.toString('hex')).toBe('abcd');
    expect(response.getDetails(0).data.epk.toString('hex')).toBe('11'.repeat(32));
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
