const mockGetIdentity = jest.fn();
const mockInitEndpoint = jest.fn();
const mockVerifyGenericRequest = jest.fn();

jest.mock('../../CoinData/CoinDirectory', () => ({
  __esModule: true,
  CoinDirectory: {
    getBasicCoinObj: jest.fn(),
  },
}));

jest.mock('../../api/channels/verusid/callCreators', () => ({
  getIdentity: mockGetIdentity,
}));

jest.mock('../../api/channels/vrpc/callCreators', () => ({
  getInfo: jest.fn(),
  verifyGenericRequest: mockVerifyGenericRequest,
}));

jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {
    initEndpoint: mockInitEndpoint,
  },
}));

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    getState: () => ({
      authentication: {
        activeAccount: null,
      },
    }),
  },
}));

import {
  CompactAddressObject,
  DataDescriptor,
  DataPacketRequestDetails,
  DataPacketRequestOrdinalVDXFObject,
  SpendableKeyDetails,
  SpendableKeyDetailsOrdinalVDXFObject,
  UserDataRequestDetails,
  UserDataRequestOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import {CoinDirectory} from '../../CoinData/CoinDirectory';
import {validateDataPacketRequestVDXFObject} from '../../deeplink/validator/dataPacketRequestValidator';
import {validateGenericRequest} from '../../deeplink/validator/envelopeValidator';
import {validateUserDataRequestVDXFObject} from '../../deeplink/validator/userDataRequestValidator';
import {
  getUserDataRequestedSignerID,
  userDataRequestedSignerMatchesIdentity,
} from '../../deeplink/userData/requestedSigner';

const SYSTEM_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const IDENTITY_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const SEARCH_DATA_HASH = Buffer.alloc(32, 1);

const requestForDetail = (detail, signed = true, hasEncryptResponseToAddress = true) => ({
  getDetails: () => detail,
  isSigned: () => signed,
  hasEncryptResponseToAddress: () => hasEncryptResponseToAddress,
  encryptResponseToAddress: hasEncryptResponseToAddress
    ? {toAddressString: () => 'zs1exampleencryptedresponseaddress'}
    : null,
});

describe('generic data request validators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CoinDirectory.getBasicCoinObj.mockReturnValue({
      system_id: SYSTEM_ID,
      testnet: false,
      vrpc_endpoints: ['https://example.invalid'],
    });
    mockGetIdentity.mockResolvedValue({
      result: {
        identity: {
          primaryaddresses: [],
          minimumsignatures: 1,
        },
      },
    });
    mockVerifyGenericRequest.mockResolvedValue(true);
  });

  it('accepts full credential user data requests', () => {
    const detail = new UserDataRequestOrdinalVDXFObject({
      data: new UserDataRequestDetails({
        searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: SEARCH_DATA_HASH}],
        dataType: UserDataRequestDetails.FULL_DATA,
        requestType: UserDataRequestDetails.CREDENTIAL,
      }),
    });

    expect(() =>
      validateUserDataRequestVDXFObject(requestForDetail(detail), 0),
    ).not.toThrow();
  });

  it('accepts a valid requested signer on credential requests', () => {
    const details = new UserDataRequestDetails({
      searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: SEARCH_DATA_HASH}],
      dataType: UserDataRequestDetails.FULL_DATA,
      requestType: UserDataRequestDetails.CREDENTIAL,
      signer: CompactAddressObject.fromIAddress(IDENTITY_ID),
    });
    const detail = new UserDataRequestOrdinalVDXFObject({
      data: details,
    });

    expect(() =>
      validateUserDataRequestVDXFObject(requestForDetail(detail), 0),
    ).not.toThrow();
    expect(getUserDataRequestedSignerID(details)).toBe(IDENTITY_ID);
    expect(
      userDataRequestedSignerMatchesIdentity(IDENTITY_ID, IDENTITY_ID),
    ).toBe(true);
    expect(
      userDataRequestedSignerMatchesIdentity(
        IDENTITY_ID,
        'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq',
      ),
    ).toBe(false);
  });

  it('rejects credential requests with an invalid requested signer', () => {
    const detail = new UserDataRequestOrdinalVDXFObject({
      data: new UserDataRequestDetails({
        flags: UserDataRequestDetails.FLAG_HAS_SIGNER,
        searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: SEARCH_DATA_HASH}],
        dataType: UserDataRequestDetails.FULL_DATA,
        requestType: UserDataRequestDetails.CREDENTIAL,
      }),
    });

    expect(() =>
      validateUserDataRequestVDXFObject(requestForDetail(detail), 0),
    ).toThrow('invalid requested signer');
  });

  it('rejects unsupported user data request modes', () => {
    const detail = new UserDataRequestOrdinalVDXFObject({
      data: new UserDataRequestDetails({
        searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: SEARCH_DATA_HASH}],
        dataType: UserDataRequestDetails.PARTIAL_DATA,
        requestType: UserDataRequestDetails.CREDENTIAL,
      }),
    });

    expect(() =>
      validateUserDataRequestVDXFObject(requestForDetail(detail), 0),
    ).toThrow('Only full credential data requests');
  });

  it('rejects credential user data requests without encrypted responses', () => {
    const detail = new UserDataRequestOrdinalVDXFObject({
      data: new UserDataRequestDetails({
        searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: SEARCH_DATA_HASH}],
        dataType: UserDataRequestDetails.FULL_DATA,
        requestType: UserDataRequestDetails.CREDENTIAL,
      }),
    });

    expect(() =>
      validateUserDataRequestVDXFObject(requestForDetail(detail, true, false), 0),
    ).toThrow('must specify encryptResponseToAddress');
  });

  it('rejects unsigned user data requests', () => {
    const detail = new UserDataRequestOrdinalVDXFObject({
      data: new UserDataRequestDetails({
        searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: SEARCH_DATA_HASH}],
        dataType: UserDataRequestDetails.FULL_DATA,
        requestType: UserDataRequestDetails.CREDENTIAL,
      }),
    });

    expect(() =>
      validateUserDataRequestVDXFObject(requestForDetail(detail, false), 0),
    ).toThrow('require a signed GenericRequest');
  });

  it('rejects legacy string credential search values', () => {
    const detail = new UserDataRequestOrdinalVDXFObject({
      data: new UserDataRequestDetails({
        searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: 'Plain Login'}],
        dataType: UserDataRequestDetails.FULL_DATA,
        requestType: UserDataRequestDetails.CREDENTIAL,
      }),
    });

    expect(() =>
      validateUserDataRequestVDXFObject(requestForDetail(detail), 0),
    ).toThrow('credential search values must be binary hashes');
  });

  it('accepts data packet requests with string and descriptor signable objects', () => {
    const detail = new DataPacketRequestOrdinalVDXFObject({
      data: new DataPacketRequestDetails({
        flags: DataPacketRequestDetails.FLAG_FOR_USERS_SIGNATURE,
        signableObjects: [
          'message',
          new DataDescriptor({objectdata: Buffer.from('descriptor')}),
        ],
      }),
    });

    expect(() =>
      validateDataPacketRequestVDXFObject(requestForDetail(detail), 0),
    ).not.toThrow();
  });

  it('rejects data packet requests without the user-signature flag', () => {
    const detail = new DataPacketRequestOrdinalVDXFObject({
      data: new DataPacketRequestDetails({
        signableObjects: ['message'],
      }),
    });

    expect(() =>
      validateDataPacketRequestVDXFObject(requestForDetail(detail), 0),
    ).toThrow("for the user's signature");
  });

  it('rejects data packet transmittal requests', () => {
    const detail = new DataPacketRequestOrdinalVDXFObject({
      data: new DataPacketRequestDetails({
        flags: DataPacketRequestDetails.FLAG_FOR_TRANSMITTAL_TO_USER,
        signableObjects: ['message'],
      }),
    });

    expect(() =>
      validateDataPacketRequestVDXFObject(requestForDetail(detail), 0),
    ).toThrow('transmittal to the user is not supported');
  });

  it('allows encrypted responses for non-user-data requests', async () => {
    const detail = new SpendableKeyDetailsOrdinalVDXFObject({
      data: new SpendableKeyDetails({
        data: Buffer.alloc(32),
        seedFormat: SpendableKeyDetails.SEED_FORMAT_BIP39,
        encryptionFormat: SpendableKeyDetails.ENCRYPTION_FORMAT_NONE,
      }),
    });

    const request = {
      details: [detail],
      getDetails: index => detail,
      isSigned: () => false,
      hasAppOrDelegatedID: () => false,
      hasEncryptResponseToAddress: () => true,
      encryptResponseToAddress: {
        toAddressString: () => 'zs1exampleencryptedresponseaddress',
      },
    };

    await expect(validateGenericRequest(request)).resolves.toBeUndefined();
    expect(request.hasEncryptResponseToAddress()).toBe(true);
    expect(mockVerifyGenericRequest).not.toHaveBeenCalled();
  });

  it('rejects unsupported data packet signable objects', () => {
    const detail = new DataPacketRequestOrdinalVDXFObject({
      data: new DataPacketRequestDetails({
        flags: DataPacketRequestDetails.FLAG_FOR_USERS_SIGNATURE,
        signableObjects: [{}],
      }),
    });

    expect(() =>
      validateDataPacketRequestVDXFObject(requestForDetail(detail), 0),
    ).toThrow('Unsupported data packet signable object type');
  });
});
