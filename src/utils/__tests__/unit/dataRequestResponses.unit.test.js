const mockRequestPrivKey = jest.fn();
const mockInitEndpoint = jest.fn();
const mockGetCurrentHeight = jest.fn();
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
      getCurrentHeight: mockGetCurrentHeight,
      signHash: mockSignHash,
    }),
  },
}));

jest.mock('../../api/channels/dlight/requests/encrypt', () => ({
  encryptData: mockEncryptData,
}));

const {
  CompactAddressObject,
  CompactIAddressObject,
  Credential,
  CredentialKey,
  DATA_TYPE_OBJECT_CREDENTIAL,
  DataDescriptor,
  DataDescriptorKey,
  DataDescriptorOrdinalVDXFObject,
  DataPacketRequestDetails,
  DataPacketRequestOrdinalVDXFObject,
  DataResponseDetails,
  DataResponseOrdinalVDXFObject,
  GenericRequest,
  GenericResponse,
  SignatureData,
  SignatureDataKey,
  UserDataRequestDetails,
  VdxfUniValue,
} = require('verus-typescript-primitives');
const createHash = require('create-hash');
const {ECPair, IdentitySignature, networks} = require('@bitgo/utxo-lib');
const {VerusIdInterface} = require('verusid-ts-client');
const {buildUserDataResponse} = require('../../deeplink/userData/buildUserDataResponse');
const {buildDataPacketResponse, signDataPacketObject} = require('../../deeplink/dataPacket/signDataPacket');
const {prepareGenericResponseForSigning} = require('../../deeplink/genericResponse/prepareGenericResponseForSigning');
const {ensureGenericResponseSigner} = require('../../deeplink/genericResponse/ensureGenericResponseSigner');
const {encryptGenericResponseDetails} = require('../../deeplink/genericResponse/encryptGenericResponseDetails');

const SYSTEM_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const IDENTITY_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const SEARCH_DATA_HASH = Buffer.alloc(32, 1);
const SIGNATURE_HEIGHT = 123456;

describe('generic data request response builders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestPrivKey.mockResolvedValue('primary-wif');
    mockGetCurrentHeight.mockResolvedValue(SIGNATURE_HEIGHT);
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
      searchDataKey: [{[credential.credentialKey]: SEARCH_DATA_HASH}],
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
      searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: SEARCH_DATA_HASH}],
      dataType: UserDataRequestDetails.FULL_DATA,
      requestType: UserDataRequestDetails.CREDENTIAL,
    });

    expect(buildUserDataResponse({userDataDetail: requestDetail, credentials: []})).toBeNull();
  });

  it('preserves response boundaries when empty descriptor fields normalize away', () => {
    // Response flags 0; descriptor version 1, label/MIME flags, data aa,
    // and explicitly present empty label and MIME strings.
    const payload = Buffer.from('00016001aa0000', 'hex');
    const prefix = Buffer.from('deadbeef', 'hex');
    const suffix = Buffer.from('123456', 'hex');
    const details = new DataResponseDetails();

    expect(details.fromBuffer(Buffer.concat([prefix, payload, suffix]), prefix.length))
      .toBe(prefix.length + payload.length);
    expect(details.data.label).toBe('');
    expect(details.data.mimeType).toBe('');
    expect(details.getByteLength()).toBeLessThan(payload.length);

    // Envelope version 1/flags 0; data-response ordinal 11/version 1.
    const responseBytes = Buffer.concat([
      Buffer.from([1, 0, 11, 1, payload.length]),
      payload,
    ]);
    const response = new GenericResponse();

    expect(response.fromBuffer(Buffer.concat([prefix, responseBytes, suffix]), prefix.length))
      .toBe(prefix.length + responseBytes.length);
    expect(response.getDetails(0)).toBeInstanceOf(DataResponseOrdinalVDXFObject);
    expect(response.getDetails(0).data.data.objectdata.toString('hex')).toBe('aa');
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
    expect(mockGetCurrentHeight).toHaveBeenCalledTimes(3);
    expect(mockSignHash).toHaveBeenCalledTimes(3);
    expect(response).toBeInstanceOf(DataResponseOrdinalVDXFObject);
    expect(response.data.requestID.toIAddress()).toBe(IDENTITY_ID);

    const value = new VdxfUniValue();
    value.fromBuffer(response.data.data.objectdata);
    expect(value.values).toHaveLength(3);
    const payloads = [
      Buffer.from('message', 'utf8'),
      descriptor.toBuffer(),
      Buffer.from('I agree to the statement', 'utf8'),
    ];

    value.values.forEach((entry, index) => {
      const signatureData = entry[SignatureDataKey.vdxfid];
      expect(signatureData).toBeInstanceOf(SignatureData);
      expect(signatureData.signatureHash).toEqual(
        createHash('sha256').update(payloads[index]).digest(),
      );
      expect(signatureData.signatureAsVch).toEqual(Buffer.from('signature'));
      expect(mockSignHash).toHaveBeenNthCalledWith(
        index + 1,
        IDENTITY_ID,
        signatureData.getIdentityHash({version: 2, hash_type: 5, height: SIGNATURE_HEIGHT}),
        'primary-wif',
        undefined,
        SIGNATURE_HEIGHT,
        SYSTEM_ID,
      );
    });
  });

  it.each([
    ['VRSC', SYSTEM_ID],
    ['VRSCTEST', 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq'],
  ])('creates a verifiable %s data signature bound to its identity context', async (id, systemID) => {
    const identityID = 'iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj';
    const key = ECPair.fromPrivateKeyBuffer(Buffer.alloc(32, 1), networks.verus);
    const client = new VerusIdInterface(systemID, 'https://example.invalid');
    client.interface.getIdentity = jest.fn().mockResolvedValue({
      result: {status: 'active', identity: {identityaddress: identityID}},
    });
    client.getCurrentHeight = jest.fn().mockRejectedValue(new Error('Height must be supplied'));
    mockRequestPrivKey.mockResolvedValueOnce(key.toWIF());
    mockSignHash.mockImplementationOnce(client.signHash.bind(client));

    const result = await signDataPacketObject({
      coinObj: {id, system_id: systemID, vrpc_endpoints: ['https://example.invalid']},
      identityAddress: identityID,
      signableObject: 'message',
    });
    const signatureData = new SignatureData();
    signatureData.fromBuffer(result.toBuffer());
    const signature = new IdentitySignature(networks.verus);
    signature.fromBuffer(signatureData.signatureAsVch, 0, systemID, identityID);
    const context = {version: signature.version, hash_type: signature.hashType, height: signature.blockHeight};

    expect(context).toEqual({version: 2, hash_type: 5, height: SIGNATURE_HEIGHT});
    expect(signatureData.signatureHash).toEqual(createHash('sha256').update('message').digest());
    expect(mockGetCurrentHeight).toHaveBeenCalledTimes(1);
    expect(client.getCurrentHeight).not.toHaveBeenCalled();
    expect(signature.verifyHashOffline(signatureData.getIdentityHash(context), key.getAddress()))
      .toEqual([true]);

    const changedFields = [
      {systemid: identityID},
      {identityid: systemID},
      {signaturehash: createHash('sha256').update('different message').digest('hex')},
    ];
    const invalidHashes = [
      signatureData.signatureHash,
      signatureData.getIdentityHash({...context, height: SIGNATURE_HEIGHT + 1}),
      ...changedFields.map(fields => SignatureData.fromJson({...signatureData.toJson(), ...fields})
        .getIdentityHash(context)),
    ];
    invalidHashes.forEach(hash => {
      expect(signature.verifyHashOffline(hash, key.getAddress())).toEqual([false]);
    });
  });

  it('does not sign a data packet object when fetching its height fails', async () => {
    mockGetCurrentHeight.mockRejectedValueOnce(new Error('Height unavailable'));

    await expect(signDataPacketObject({
      coinObj: {id: 'VRSC', system_id: SYSTEM_ID, vrpc_endpoints: ['https://example.invalid']},
      identityAddress: IDENTITY_ID,
      signableObject: 'message',
    })).rejects.toThrow('Height unavailable');
    expect(mockSignHash).not.toHaveBeenCalled();
  });

  it('encrypts complete generic response details when requested', async () => {
    const detailA = buildUserDataResponse({
      userDataDetail: new UserDataRequestDetails({
        searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: SEARCH_DATA_HASH}],
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

  it.each([false, true])('preserves network context through response signing and serialization (testnet: %s)', async testnet => {
    const rootSystemName = testnet ? 'VRSCTEST' : 'VRSC';
    const systemID = testnet ? 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq' : SYSTEM_ID;
    const request = new GenericRequest({
      requestID: CompactIAddressObject.fromFQN('response-test@', rootSystemName),
      details: [new DataPacketRequestOrdinalVDXFObject({
        data: new DataPacketRequestDetails({signableObjects: ['message']}),
      })],
    });
    if (testnet) request.setIsTestnet();
    const response = new GenericResponse({details: [new DataResponseOrdinalVDXFObject({
      data: new DataResponseDetails({data: new DataDescriptor({objectdata: Buffer.from('result')})}),
    })]});
    ensureGenericResponseSigner({response, systemID, identityID: IDENTITY_ID});
    prepareGenericResponseForSigning({request, response, handledBy: 123, createdAtSeconds: '100'});

    const client = new VerusIdInterface(systemID, 'https://example.invalid');
    client.signHash = jest.fn(async () => Buffer.from('signature').toString('base64'));
    await client.signGenericResponse(response, 'unused', undefined, SIGNATURE_HEIGHT);
    const parsed = new GenericResponse();
    const bytes = response.toBuffer();
    expect(parsed.fromBuffer(bytes)).toBe(bytes.length);

    expect(response.isTestnet()).toBe(testnet);
    expect(parsed.isTestnet()).toBe(testnet);
    expect(parsed.requestID.rootSystemName).toBe(rootSystemName);
    expect(parsed.requestID.toIAddress()).toBe(request.requestID.toIAddress());
    expect(parsed.signature.isTestnet).toBe(testnet);
    expect(parsed.signature.systemID.toIAddress()).toBe(systemID);
    expect(parsed.signature.identityID.toIAddress()).toBe(IDENTITY_ID);
    expect(parsed.requestHash.equals(request.getRawDataSha256())).toBe(true);
    expect(parsed.getDetailsIdentitySignatureHash(SIGNATURE_HEIGHT))
      .toEqual(response.getDetailsIdentitySignatureHash(SIGNATURE_HEIGHT));
    expect(parsed.toBuffer()).toEqual(bytes);
  });
});
