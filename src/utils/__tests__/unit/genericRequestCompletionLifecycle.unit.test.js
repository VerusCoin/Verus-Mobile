let mockState;
let mockSignerSystemID;
const mockDispatch = jest.fn();
const mockEncrypt = jest.fn();
const mockSign = jest.fn();
const mockVerify = jest.fn();
const mockPost = jest.fn();
const mockAlert = jest.fn();
const mockCoinLookup = jest.fn();
const mockMarkComplete = jest.fn();
const mockHandleAuthentication = jest.fn();

jest.mock('@react-navigation/native', () => ({CommonActions: {reset: payload => ({type: 'RESET', ...payload})}}));
jest.mock('@react-navigation/drawer', () => ({createDrawerNavigator: () => ({Navigator: 'Drawer', Screen: 'Screen'})}));
jest.mock('../../../containers/SideMenu/SideMenu', () => 'SideMenu');
jest.mock('../../../containers/RootStack/MainStackScreens/MainStackScreens', () => 'MainStack');
jest.mock('react-redux', () => ({useSelector: selector => selector(mockState), useDispatch: () => mockDispatch,
  useStore: () => ({getState: () => mockState})}));
jest.mock('../../../store', () => ({getState: () => mockState}));
// GenericRequestHome renders its delivery sheet with these components; the
// sheet's state is read from its props.
jest.mock('react-native', () => require('../../../tests/helpers/mockReactNative')({View: 'View', StyleSheet: {create: styles => styles}}));
jest.mock('react-native-paper', () => ({Portal: 'Portal', Text: 'Text'}));
jest.mock('react-native-safe-area-context', () => ({SafeAreaProvider: 'SafeAreaProvider', useSafeAreaInsets: () => ({top: 0, bottom: 0})}));
jest.mock('lottie-react-native', () => 'LottieView');
jest.mock('verusid-ts-client', () => ({primitives: require('verus-typescript-primitives')}));
jest.mock('../../../styles', () => ({}));
jest.mock('../../../globals/colors', () => ({}));
jest.mock('../../../components/AnimatedActivityIndicatorBox', () => 'ActivityIndicator');
jest.mock('../../../components/AnimatedSuccessCheckmark', () => 'SuccessCheckmark');
jest.mock('../../../components/AppButton', () => 'AppButton');
jest.mock('../../../components/BottomSheetModal', () => 'BottomSheetModal');
jest.mock('../../../components/NeutralCheckMark', () => 'NeutralCheckMark');
jest.mock('../../../components/SheetScrollView', () => 'SheetScrollView');
jest.mock('../../../theme/onboarding', () => ({useOnboardingTheme: () => ({typography: {}, colors: {}})}));
jest.mock('../../../components/SelectionSheet', () => ({__esModule: true, default: 'SelectionSheet', SelectionRow: 'SelectionRow'}));
jest.mock('../../../components/useSheetDismissal', () => () => ({close: jest.fn(), dismiss: jest.fn(), onClosed: jest.fn()}));
jest.mock('../../../containers/DeepLink/components/RequestReview/DeepLinkVerusIdDetailsSheet', () => 'VerusIdDetailsSheet');
jest.mock('../../../containers/DeepLink/components/RequestReview/OpenInAnotherWalletAction', () => 'OpenInAnotherWalletAction');
jest.mock('../../../containers/DeepLink/GenericRequestLoading', () => ({
  __esModule: true, default: 'GenericRequestLoading', GENERIC_REQUEST_LOADING_STEPS: {},
}));
jest.mock('../../../containers/DeepLink/InvoiceInfo/InvoiceInfo', () => 'InvoiceInfo');
jest.mock('../../../containers/DeepLink/AuthenticationRequestInfo/AuthenticationRequestInfo', () => 'AuthenticationRequestInfo');
jest.mock('../../../containers/DeepLink/IdentityUpdateRequestInfo/IdentityUpdateRequestInfo', () => 'IdentityUpdateRequestInfo');
jest.mock('../../../containers/DeepLink/AppEncryptionRequestInfo/AppEncryptionRequestInfo', () => 'AppEncryptionRequestInfo');
jest.mock('../../../containers/DeepLink/WalletBackupRequestInfo/WalletBackupRequestInfo', () => 'WalletBackupRequestInfo');
jest.mock('../../../containers/DeepLink/SpendableKeyRequestInfo/SpendableKeyRequestInfo', () => 'SpendableKeyRequestInfo');
jest.mock('../../../containers/DeepLink/UserDataRequestInfo/UserDataRequestInfo', () => 'UserDataRequestInfo');
jest.mock('../../../containers/DeepLink/DataPacketRequestInfo/DataPacketRequestInfo', () => 'DataPacketRequestInfo');
jest.mock('../../deeplink/handlers/authenticationRequestDetailsHandler', () => ({
  handleAuthenticationRequestDetailsVDXFObject: (...args) => mockHandleAuthentication(...args),
}));
jest.mock('../../deeplink/handlers/verusPayInvoiceDetailsHandler', () => ({}));
jest.mock('../../deeplink/handlers/identityUpdateRequestDetailsHandler', () => ({}));
jest.mock('../../deeplink/handlers/provisionIdentityDetailsHandler', () => ({}));
jest.mock('../../deeplink/handlers/appEncryptionRequestHandler', () => ({}));
jest.mock('../../deeplink/handlers/createWalletBackupDetailsHandler', () => ({}));
jest.mock('../../deeplink/handlers/spendableKeyDetailsHandler', () => ({}));
jest.mock('../../deeplink/handlers/userDataRequestHandler', () => ({}));
jest.mock('../../deeplink/handlers/dataPacketRequestHandler', () => ({}));
jest.mock('../../deeplink/isDeeplinkHandlerInstalled', () => ({isDeeplinkHandlerInstalled: async () => false}));
jest.mock('../../deeplink/pendingDeeplinkStorage', () => ({markPendingDeeplinkComplete: (...args) => mockMarkComplete(...args)}));
jest.mock('../../api/channels/verusid/callCreators', () => ({}));
jest.mock('../../../actions/actionCreators', () => jest.requireActual('../../../actions/actions/deeplink/creators/deeplink'));
jest.mock('axios', () => ({post: (...args) => mockPost(...args)}));
jest.mock('react-native-url-polyfill', () => ({URL: require('url').URL}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {getBasicCoinObj: (...args) => mockCoinLookup(...args)}}));
jest.mock('../../api/channels/vrpc/callCreators', () => ({signGenericResponse: (...args) => mockSign(...args)}));
jest.mock('../../api/channels/vrpc/requests/verifyGenericResponse', () => ({verifyGenericResponse: (...args) => mockVerify(...args)}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({createAlert: (...args) => mockAlert(...args), resolveAlert: jest.fn()}));
jest.mock('../../deeplink/genericResponse/encryptGenericResponseDetails', () => ({encryptGenericResponseDetails: (...args) => mockEncrypt(...args)}));
jest.mock('../../deeplink/genericResponse/prepareGenericResponseForSigning', () => ({prepareGenericResponseForSigning: jest.fn()}));
jest.mock('../../deeplink/genericResponse/responseDeliverySecurity', () => ({assertNoPlaintextAppEncryptionResponse: jest.fn(), assertSecurePostResponseUri: value => value}));
jest.mock('../../deeplink/validator/authenticationRequestValidator', () => ({
  assertAuthenticationRequestsNotExpired: jest.fn(),
  performAfterAuthenticationExpiryCheck: (_, operation) => operation(),
  signAfterAuthenticationExpiryCheck: (_, operation) => operation(),
}));
jest.mock('verus-typescript-primitives', () => ({
  ...jest.requireActual('verus-typescript-primitives'),
  // A request named "sign-in…" holds one sign-in detail, which
  // GenericRequestHome opens; "encryption" holds an app encryption detail.
  GenericRequest: class {
    fromBuffer(bytes) {
      this.marker = bytes.toString();
      const key = this.marker === 'encryption' ? 'app-encryption'
        : this.marker.startsWith('sign-in') ? jest.requireActual('verus-typescript-primitives').AUTHENTICATION_REQUEST_VDXF_KEY.vdxfid
          : null;
      this.details = key ? [{getIAddressKey: () => key}] : [];
    }
    details = [];
    responseURIs = [{type: 1, getUriString: () => 'https://example.invalid/response'}];
    hasEncryptResponseToAddress() { return false; }
    getDetails(index) { return this.details[index]; }
    isTestnet() { return false; }
    toBuffer() { return Buffer.from(this.marker); }
  },
  GenericResponse: class {
    fromBuffer() {}
    details = [];
    signature = {systemID: {toIAddress: () => mockSignerSystemID}};
    toBuffer() { return Buffer.from('synthetic-response'); }
  },
  ResponseURI: {TYPE_POST: {toNumber: () => 1}, TYPE_REDIRECT: {toNumber: () => 2}},
  APP_ENCRYPTION_REQUEST_VDXF_KEY: {vdxfid: 'app-encryption'},
  IDENTITY_UPDATE_RESPONSE_VDXF_KEY: {vdxfid: 'identity-update'},
  GENERIC_RESPONSE_DEEPLINK_VDXF_KEY: {vdxfid: 'response'},
  VERUS_MOBILE_GENERIC_REQUEST_HANDLER_ID: 'mobile',
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const SignedInStack = require('../../../containers/RootStack/SignedInStackScreens/SignedInStackScreens').default;
const {GenericResponse} = require('verus-typescript-primitives');
const {deeplink} = require('../../../reducers/deeplink');
const {createGenericResponseDelivery} = require('../../deeplink/genericRequestDelivery');
const GenericRequestHome = require('../../../containers/DeepLink/GenericRequestHome/GenericRequestHome').default;
const deferred = () => {
  let resolve;
  const promise = new Promise(yes => {resolve = yes;});
  return {promise, resolve};
};
// A closed request stops its delivery at the next check, as GenericRequestHome does.
const openRequest = () => {
  const request = {closed: false};
  request.assertCurrent = () => {if (request.closed) throw new Error('Request closed');};
  return request;
};
const hex = value => Buffer.from(value).toString('hex');
const start = (request = openRequest(), args = {}, deliver = createGenericResponseDelivery()) => ({
  request,
  pending: deliver({requestBufferString: 'aa', responseBufferString: 'bb', assertCurrent: request.assertCurrent, ...args}),
});
let views;
beforeEach(() => {
  jest.clearAllMocks();
  views = new Set();
  mockSignerSystemID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
  mockCoinLookup.mockReturnValue({id: 'VRSC', system_id: mockSignerSystemID});
  mockState = {authentication: {signedIn: true, activeAccount: {accountHash: 'account'}, sessionEpoch: 1},
    deeplink: {id: 'generic', data: 'aa', requestId: 1, passthrough: {pendingDeeplinkId: 'saved-gift'}}};
  mockDispatch.mockImplementation(action => {mockState = {...mockState, deeplink: deeplink(mockState.deeplink, action)};});
  mockEncrypt.mockResolvedValue(undefined);
  mockSign.mockResolvedValue(new GenericResponse());
  mockVerify.mockResolvedValue(true);
  mockPost.mockResolvedValue({});
  mockMarkComplete.mockResolvedValue(undefined);
  mockHandleAuthentication.mockImplementation(async (_request, response) => ({
    response, displayProps: {}, handledIndices: [],
  }));
  mockState.authentication.accounts = [{accountHash: 'account'}];
  mockState.settings = {generalWalletSettings: {}};
});
afterEach(() => {
  act(() => views.forEach(view => view.unmount()));
  jest.useRealTimers();
});

// The request screen: GenericRequestHome opens the sign-in detail, the
// detail approves with auto delivery, and the delivery sheet sends the
// response. DeepLink passes finishRequest, which clears only this request's
// deeplink (resetDeeplinkData(requestId)) and runs the exit when it is still
// current; the dispatcher suite covers that guard.
const navigationState = {type: 'stack', index: 0, routes: [{key: 'deeplink', name: 'DeepLink'}]};
const renderHome = async (deeplink = 'sign-in') => {
  const props = {
    navigation: {navigate: jest.fn(), dispatch: jest.fn(), getState: () => navigationState, getParent: () => undefined},
    cancel: jest.fn(),
    finishRequest: jest.fn(action => action?.()),
    setLoading: jest.fn(),
  };
  let view;
  await act(async () => {view = create(<GenericRequestHome {...props} deeplinkData={hex(deeplink)} />);});
  views.add(view);
  return {view, props};
};
const respondedSignIn = () => {
  const response = new GenericResponse();
  response.details = [{getIAddressKey: () => 'sign-in-response'}];
  return response;
};
// The detail approves; GenericRequestHome starts the delivery on its own.
const approve = async view => {
  const {next} = view.root.findByType('AuthenticationRequestInfo').props;
  await act(async () => {next(respondedSignIn(), [0], {autoDeliverOnComplete: true});});
};
const deliverySheet = view => view.root.findAll(node => node.props.onRetry && node.props.status != null)[0];
const flushAsync = () => act(async () => {for (let i = 0; i < 5; i += 1) await Promise.resolve();});

it('delivers a current response once and clears only its request after completion', async () => {
  jest.useFakeTimers();
  const {view, props} = await renderHome();
  await approve(view);
  // A second start while the first delivery runs is ignored.
  await act(async () => {deliverySheet(view).props.onRetry();});
  await flushAsync();
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockPost).toHaveBeenCalledTimes(1);
  expect(mockMarkComplete).toHaveBeenCalledTimes(1);
  expect(mockMarkComplete).toHaveBeenCalledWith('saved-gift');
  expect(deliverySheet(view).props.status).toBe('success');
  expect(props.finishRequest).not.toHaveBeenCalled();
  // A posted response leaves the request after a short success pause.
  await act(async () => {jest.advanceTimersByTime(1000);});
  expect(props.finishRequest).toHaveBeenCalledTimes(1);
  expect(props.navigation.dispatch).toHaveBeenCalledTimes(1);
  expect(props.navigation.dispatch.mock.calls[0][0]).toMatchObject({type: 'RESET', index: 0, routes: [{name: 'SignedInStack'}]});
  expect(props.cancel).not.toHaveBeenCalled();
});

it('completes an app-encryption response on the selected PBaaS chain', async () => {
  mockSignerSystemID = jest.requireActual('verus-typescript-primitives').toIAddress('selectedchain', 'VRSC');
  const selectedCoin = {
    id: mockSignerSystemID,
    system_id: mockSignerSystemID,
    vrpc_endpoints: ['https://selected-chain.example.com'],
  };
  mockCoinLookup.mockImplementation(systemID => {
    if (systemID !== mockSignerSystemID) throw new Error('Unexpected signing chain');
    return selectedCoin;
  });
  await start(openRequest(), {requestBufferString: hex('encryption')}).pending;

  expect(mockCoinLookup).toHaveBeenCalledWith(mockSignerSystemID);
  expect(mockSign).toHaveBeenCalledWith(selectedCoin, expect.any(GenericResponse), expect.any(Object));
  expect(mockVerify).toHaveBeenCalledWith(selectedCoin, expect.any(GenericResponse));
  expect(mockPost).toHaveBeenCalledTimes(1);
  expect(mockAlert).not.toHaveBeenCalled();
});

it.each(['encrypt', 'sign', 'verify', 'post'])('stops completion after unmount while %s is pending', async phase => {
  const wait = deferred();
  const methods = {encrypt: mockEncrypt, sign: mockSign, verify: mockVerify, post: mockPost};
  methods[phase].mockReturnValueOnce(wait.promise);
  const {view, props} = await renderHome();
  await approve(view);
  await flushAsync();
  expect(methods[phase]).toHaveBeenCalledTimes(1);
  act(() => view.unmount());
  views.delete(view);
  await act(async () => {wait.resolve(phase === 'sign' ? new GenericResponse() : true);});
  await flushAsync();
  expect(mockPost).toHaveBeenCalledTimes(phase === 'post' ? 1 : 0);
  expect(mockMarkComplete).not.toHaveBeenCalled();
  expect(props.finishRequest).not.toHaveBeenCalled();
  expect(props.navigation.dispatch).not.toHaveBeenCalled();
  expect(mockAlert).not.toHaveBeenCalled();
});

it.each(['replacement', 'session'])('does not deliver or clear an old request after %s changes during signing', async change => {
  const wait = deferred();
  mockSign.mockReturnValueOnce(wait.promise);
  const {view, props} = await renderHome();
  await approve(view);
  await flushAsync();
  expect(mockSign).toHaveBeenCalledTimes(1);
  if (change === 'replacement') {
    // A new deeplink remounts the request session (GenericRequestHome key).
    await act(async () => {view.update(<GenericRequestHome {...props} deeplinkData={hex('sign-in-replacement')} />);});
    expect(mockHandleAuthentication).toHaveBeenCalledTimes(2);
  } else {
    mockState.authentication = {...mockState.authentication, sessionEpoch: 2};
  }
  await act(async () => {wait.resolve(new GenericResponse());});
  await flushAsync();
  expect(mockPost).not.toHaveBeenCalled();
  expect(mockMarkComplete).not.toHaveBeenCalled();
  expect(props.finishRequest).not.toHaveBeenCalled();
  expect(props.navigation.dispatch).not.toHaveBeenCalled();
  expect(mockAlert).not.toHaveBeenCalled();
});

it.each(['profile', 'network'])('discards an encryption response if the %s changes while it is prepared', async change => {
  const wait = deferred();
  mockEncrypt.mockReturnValueOnce(wait.promise);
  const {pending} = start(openRequest(), {requestBufferString: hex('encryption')});
  const settled = pending.catch(() => {});
  await act(async () => {await Promise.resolve();});
  if (change === 'profile') mockState.authentication.activeAccount = {accountHash: 'other'};
  else mockState.authentication.activeAccount.testnetOverrides = {VRSC: 'VRSCTEST'};
  await act(async () => {wait.resolve(); await settled;});
  await expect(pending).rejects.toThrow();
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockPost).not.toHaveBeenCalled();
});

it('discards an encryption response if the network changes during final signing', async () => {
  const wait = deferred();
  mockSign.mockReturnValueOnce(wait.promise);
  const {pending} = start(openRequest(), {requestBufferString: hex('encryption')});
  const settled = pending.catch(() => {});
  await act(async () => { await Promise.resolve(); });
  mockState.authentication.activeAccount.testnetOverrides = {VRSC: 'VRSCTEST'};
  await act(async () => { wait.resolve(new GenericResponse()); await settled; });
  await expect(pending).rejects.toThrow();
  expect(mockPost).not.toHaveBeenCalled();
});

it('resets a mounted replacement response while an old completion is pending', async () => {
  const oldEncryption = deferred();
  const newSignature = deferred();
  mockEncrypt.mockReturnValueOnce(oldEncryption.promise);
  const {view, props} = await renderHome();
  await approve(view);
  await flushAsync();
  expect(mockEncrypt).toHaveBeenCalledTimes(1);
  expect(mockSign).not.toHaveBeenCalled();

  mockState.deeplink = {...mockState.deeplink, data: hex('sign-in-replacement'), requestId: 2};
  await act(async () => {view.update(<GenericRequestHome {...props} deeplinkData={hex('sign-in-replacement')} />);});
  // The replacement starts with no response and no delivery.
  expect(deliverySheet(view).props.status).toBe('idle');
  mockSign.mockReturnValueOnce(newSignature.promise);
  await approve(view);
  await flushAsync();
  await act(async () => {oldEncryption.resolve();});
  await flushAsync();
  // Only the replacement's delivery signs; the old one stops before signing.
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockPost).not.toHaveBeenCalled();
  await act(async () => {newSignature.resolve(new GenericResponse());});
  await flushAsync();
  expect(mockPost).toHaveBeenCalledTimes(1);
  expect(mockMarkComplete).toHaveBeenCalledTimes(1);
});

it('waits for replacement URL parsing, then returns the nested stack to verification', async () => {
  const {StackRouter, CommonActions} = jest.requireActual('@react-navigation/routers');
  const rootRouter = StackRouter({initialRouteName: 'SignedInStack'});
  const rootOptions = {routeNames: ['SignedInStack', 'DeepLink'], routeParamList: {}, routeGetIdList: {}};
  const childRouter = StackRouter({initialRouteName: 'VerifyDeepLink'});
  const childOptions = {routeNames: ['VerifyDeepLink', 'LoginRequestComplete'], routeParamList: {}, routeGetIdList: {}};
  let root = rootRouter.getInitialState(rootOptions);
  root = rootRouter.getStateForAction(root, CommonActions.navigate('DeepLink'), rootOptions);
  let child = childRouter.getInitialState(childOptions);
  child = childRouter.getStateForAction(child, CommonActions.navigate('LoginRequestComplete', {}), childOptions);
  root.routes[root.index].state = child;
  const navigation = {navigate: jest.fn((name, params) => {
    root = rootRouter.getStateForAction(root, CommonActions.navigate(name, params), rootOptions);
    // React Navigation passes a nested screen target to the child router.
    const target = root.routes[root.index].params;
    child = childRouter.getStateForAction(child, CommonActions.navigate(target.screen, target.params), childOptions);
    root.routes[root.index].state = child;
  })};

  mockState.deeplink = {...mockState.deeplink, url: 'verus://replacement', parsingUrl: true};
  let stack;
  act(() => {stack = create(<SignedInStack navigation={navigation} />);});
  views.add(stack);
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(child.routes[child.index].name).toBe('LoginRequestComplete');

  mockState.deeplink = {...mockState.deeplink, data: 'cc', requestId: 2, parsingUrl: false};
  await act(async () => stack.update(<SignedInStack navigation={navigation} />));
  expect(navigation.navigate).toHaveBeenCalledWith('DeepLink', {screen: 'VerifyDeepLink'});
  expect(child.routes.map(route => route.name)).toEqual(['VerifyDeepLink']);
  expect(mockState.deeplink).toMatchObject({data: 'cc', requestId: 2, url: null});
  // The old request's pending delivery is covered on the request screen:
  // "resets a mounted replacement response while an old completion is pending".
});
