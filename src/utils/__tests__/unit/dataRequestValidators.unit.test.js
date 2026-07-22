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

const SYSTEM_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const IDENTITY_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';

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
        searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: 'Plain Login'}],
        dataType: UserDataRequestDetails.FULL_DATA,
        requestType: UserDataRequestDetails.CREDENTIAL,
      }),
    });

    expect(() =>
      validateUserDataRequestVDXFObject(requestForDetail(detail), 0),
    ).not.toThrow();
  });

  it('rejects unsupported user data request modes', () => {
    const detail = new UserDataRequestOrdinalVDXFObject({
      data: new UserDataRequestDetails({
        searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: 'Plain Login'}],
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
        searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: 'Plain Login'}],
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
        searchDataKey: [{iHh1FFVvcNb2mcBudD11umfKJXHbBbH6Sj: 'Plain Login'}],
        dataType: UserDataRequestDetails.FULL_DATA,
        requestType: UserDataRequestDetails.CREDENTIAL,
      }),
    });

    expect(() =>
      validateUserDataRequestVDXFObject(requestForDetail(detail, false), 0),
    ).toThrow('require a signed GenericRequest');
  });

  it('accepts data packet requests with string and descriptor signable objects', () => {
    const detail = new DataPacketRequestOrdinalVDXFObject({
      data: new DataPacketRequestDetails({
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
        signableObjects: [{}],
      }),
    });

    expect(() =>
      validateDataPacketRequestVDXFObject(requestForDetail(detail), 0),
    ).toThrow('Unsupported data packet signable object type');
  });
});
