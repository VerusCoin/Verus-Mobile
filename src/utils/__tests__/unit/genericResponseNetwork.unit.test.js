const mockHandleAuthentication = jest.fn();

jest.mock('react-native', () => ({View: 'View', TouchableOpacity: 'TouchableOpacity'}));
jest.mock('react-native-paper', () => ({Portal: 'Portal', Text: 'Text'}));
jest.mock('react-redux', () => ({
  useSelector: selector => selector({deeplink: {passthrough: {}}}),
}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({top: 0})}));
jest.mock('verusid-ts-client', () => ({primitives: require('verus-typescript-primitives')}));
jest.mock('../../../styles', () => ({}));
jest.mock('../../../globals/colors', () => ({}));
jest.mock('../../../components/AnimatedActivityIndicatorBox', () => 'ActivityIndicator');
jest.mock('../../../components/ListSelectionModal/ListSelectionModal', () => 'SelectionModal');
jest.mock('../../../components/VerusIdDetailsModal/VerusIdDetailsModal', () => 'IdentityModal');
jest.mock('../../../containers/DeepLink/InvoiceInfo/InvoiceInfo', () => 'InvoiceInfo');
jest.mock('../../../containers/DeepLink/AuthenticationRequestInfo/AuthenticationRequestInfo', () => 'AuthenticationRequestInfo');
jest.mock('../../../containers/DeepLink/IdentityUpdateRequestInfo/IdentityUpdateRequestInfo', () => 'IdentityUpdateRequestInfo');
jest.mock('../../../containers/DeepLink/AppEncryptionRequestInfo/AppEncryptionRequestInfo', () => 'AppEncryptionRequestInfo');
jest.mock('../../../containers/DeepLink/WalletBackupRequestInfo/WalletBackupRequestInfo', () => 'WalletBackupRequestInfo');
jest.mock('../../../containers/DeepLink/SpendableKeyRequestInfo/SpendableKeyRequestInfo', () => 'SpendableKeyRequestInfo');
jest.mock('../../../containers/DeepLink/UserDataRequestInfo/UserDataRequestInfo', () => 'UserDataRequestInfo');
jest.mock('../../../containers/DeepLink/DataPacketRequestInfo/DataPacketRequestInfo', () => 'DataPacketRequestInfo');
jest.mock('../../deeplink/handlers/authenticationRequestDetailsHandler', () => ({
  handleAuthenticationRequestDetailsVDXFObject: mockHandleAuthentication,
}));
jest.mock('../../deeplink/handlers/verusPayInvoiceDetailsHandler', () => ({}));
jest.mock('../../deeplink/handlers/identityUpdateRequestDetailsHandler', () => ({}));
jest.mock('../../deeplink/handlers/provisionIdentityDetailsHandler', () => ({}));
jest.mock('../../deeplink/handlers/appEncryptionRequestHandler', () => ({}));
jest.mock('../../deeplink/handlers/createWalletBackupDetailsHandler', () => ({}));
jest.mock('../../deeplink/handlers/spendableKeyDetailsHandler', () => ({}));
jest.mock('../../deeplink/handlers/userDataRequestHandler', () => ({}));
jest.mock('../../deeplink/handlers/dataPacketRequestHandler', () => ({}));
jest.mock('../../deeplink/isDeeplinkHandlerInstalled', () => ({
  isDeeplinkHandlerInstalled: async () => false,
}));
jest.mock('../../api/channels/verusid/callCreators', () => ({}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({createAlert: jest.fn()}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {
  AuthenticationRequestDetails,
  AuthenticationRequestOrdinalVDXFObject,
  AuthenticationResponseDetails,
  AuthenticationResponseOrdinalVDXFObject,
  CompactIAddressObject,
  GenericRequest,
  GenericResponse,
} = require('verus-typescript-primitives');
const GenericRequestHome = require('../../../containers/DeepLink/GenericRequestHome/GenericRequestHome').default;

describe('generic response network context during request handling', () => {
  let renderer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleAuthentication.mockImplementation(async (_request, response) => ({
      response,
      displayProps: {},
      handledIndices: [],
    }));
  });

  afterEach(() => {
    if (renderer) act(() => renderer.unmount());
  });

  it.each([
    ['VRSCTEST', false],
    ['VRSCTEST', true],
    ['VRSC', false],
    ['VRSC', true],
  ])('preserves %s compact IDs when a child returns a fresh response: %s', async (rootSystemName, freshResponse) => {
    const isTestnet = rootSystemName === 'VRSCTEST';
    // A mistaken mainnet parse would strip .vrsc from this testnet name
    // on the next serialization, even if the envelope flag is corrected later.
    const requestID = CompactIAddressObject.fromFQN('alice.vrsc@', rootSystemName);
    const request = new GenericRequest({
      details: [new AuthenticationRequestOrdinalVDXFObject({
        data: new AuthenticationRequestDetails({requestID}),
      })],
    });
    if (isTestnet) request.setIsTestnet();
    const navigation = {navigate: jest.fn()};

    await act(async () => {
      renderer = create(<GenericRequestHome
        deeplinkData={request.toBuffer().toString('hex')}
        navigation={navigation}
        cancel={jest.fn()}
      />);
    });

    expect(mockHandleAuthentication).toHaveBeenCalledTimes(1);
    expect(mockHandleAuthentication.mock.calls[0][1].isTestnet()).toBe(isTestnet);
    const screen = renderer.root.findByType('AuthenticationRequestInfo');
    let response = freshResponse ? new GenericResponse() : screen.props.response;
    response.details = [new AuthenticationResponseOrdinalVDXFObject({
      data: new AuthenticationResponseDetails({
        requestID: screen.props.request.details[0].data.requestID,
      }),
    })];
    response.setFlags();

    if (!freshResponse) {
      // Authentication and identity flows clone an existing response this way.
      const cloned = new GenericResponse();
      cloned.fromBuffer(response.toBuffer());
      response = cloned;
    }

    await act(async () => {
      await screen.props.next(response, [0]);
    });

    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    const [destination, params] = navigation.navigate.mock.calls[0];
    expect(destination).toBe('GenericRequestComplete');
    const received = new GenericResponse();
    received.fromBuffer(Buffer.from(params.responseBufferString, 'hex'));
    expect(received.isTestnet()).toBe(isTestnet);
    expect(received.details[0].data.requestID.rootSystemName).toBe(rootSystemName);
    expect(received.details[0].data.requestID.toIAddress()).toBe(requestID.toIAddress());
  });
});
