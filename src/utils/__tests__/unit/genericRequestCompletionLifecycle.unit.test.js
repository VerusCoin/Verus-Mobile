let mockState;
const mockDispatch = jest.fn();
const mockEncrypt = jest.fn();
const mockSign = jest.fn();
const mockVerify = jest.fn();
const mockPost = jest.fn();
const mockMarkComplete = jest.fn();
const mockAlert = jest.fn();

jest.mock('react-native', () => ({Platform: {OS: 'ios'}, SafeAreaView: 'SafeAreaView', View: 'View', TouchableOpacity: 'TouchableOpacity', Clipboard: {setString: jest.fn()}}));
jest.mock('react-native-paper', () => ({Text: 'Text'}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({bottom: 0})}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({CommonActions: {reset: payload => ({type: 'RESET', ...payload})}}));
jest.mock('@react-navigation/drawer', () => ({createDrawerNavigator: () => ({Navigator: 'Drawer', Screen: 'Screen'})}));
jest.mock('../../../containers/SideMenu/SideMenu', () => 'SideMenu');
jest.mock('../../../containers/RootStack/MainStackScreens/MainStackScreens', () => 'MainStack');
jest.mock('react-redux', () => ({useSelector: selector => selector(mockState), useDispatch: () => mockDispatch,
  useStore: () => ({getState: () => mockState})}));
jest.mock('../../../store', () => ({getState: () => mockState}));
jest.mock('../../../actions/actionCreators', () => jest.requireActual('../../../actions/actions/deeplink/creators/deeplink'));
jest.mock('../../../components/Button', () => 'Button');
jest.mock('../../../components/GradientButton', () => 'GradientButton');
jest.mock('../../../components/AnimatedSuccessCheckmark', () => 'Checkmark');
jest.mock('../../../components/AnimatedActivityIndicatorBox', () => 'Loading');
jest.mock('../../../styles', () => ({genericRequestCompleteStyles: {}}));
jest.mock('axios', () => ({post: (...args) => mockPost(...args)}));
jest.mock('react-native-url-polyfill', () => ({URL: require('url').URL}));
jest.mock('../../linking', () => ({openUrl: jest.fn()}));
jest.mock('../../CoinData/CoinData', () => ({getSystemNameFromSystemId: () => 'VRSC'}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {getBasicCoinObj: () => ({id: 'VRSC'})}}));
jest.mock('../../api/channels/vrpc/callCreators', () => ({signGenericResponse: (...args) => mockSign(...args)}));
jest.mock('../../api/channels/vrpc/requests/verifyGenericResponse', () => ({verifyGenericResponse: (...args) => mockVerify(...args)}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({createAlert: (...args) => mockAlert(...args), resolveAlert: jest.fn()}));
jest.mock('../../deeplink/pendingDeeplinkStorage', () => ({markPendingDeeplinkComplete: (...args) => mockMarkComplete(...args)}));
jest.mock('../../deeplink/genericResponse/encryptGenericResponseDetails', () => ({encryptGenericResponseDetails: (...args) => mockEncrypt(...args)}));
jest.mock('../../deeplink/genericResponse/prepareGenericResponseForSigning', () => ({prepareGenericResponseForSigning: jest.fn()}));
jest.mock('../../deeplink/genericResponse/responseDeliverySecurity', () => ({assertNoPlaintextExtendedSpendingKey: jest.fn(), assertSecurePostResponseUri: value => value}));
jest.mock('../../deeplink/validator/authenticationRequestValidator', () => ({performAfterAuthenticationExpiryCheck: (_, operation) => operation(), signAfterAuthenticationExpiryCheck: (_, operation) => operation()}));
jest.mock('verus-typescript-primitives', () => ({
  GenericRequest: class {
    fromBuffer() {}
    responseURIs = [{type: 1, getUriString: () => 'https://example.invalid/response'}];
    hasEncryptResponseToAddress() { return false; }
  },
  GenericResponse: class {
    fromBuffer() {}
    details = [];
    signature = {systemID: {toIAddress: () => 'system'}};
    toBuffer() { return Buffer.from('synthetic-response'); }
  },
  ResponseURI: {TYPE_POST: {toNumber: () => 1}, TYPE_REDIRECT: {toNumber: () => 2}},
  IDENTITY_UPDATE_RESPONSE_VDXF_KEY: {vdxfid: 'identity-update'},
  GENERIC_RESPONSE_DEEPLINK_VDXF_KEY: {vdxfid: 'response'},
  VERUS_MOBILE_GENERIC_REQUEST_HANDLER_ID: 'mobile',
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const Complete = require('../../../containers/DeepLink/GenericRequestComplete/GenericRequestComplete').default;
const SignedInStack = require('../../../containers/RootStack/SignedInStackScreens/SignedInStackScreens').default;
const {GenericResponse} = require('verus-typescript-primitives');
const {deeplink} = require('../../../reducers/deeplink');
const deferred = () => {
  let resolve;
  const promise = new Promise(yes => {resolve = yes;});
  return {promise, resolve};
};
let views;
const mount = () => {
  const navigation = {dispatch: jest.fn()};
  let view;
  act(() => {view = create(<Complete route={{params: {requestBufferString: 'aa', responseBufferString: 'bb'}}} navigation={navigation} />);});
  views.add(view);
  return {view, navigation, complete: view.root.findByType('GradientButton').props.onPress};
};
beforeEach(() => {
  jest.clearAllMocks();
  views = new Set();
  mockState = {authentication: {signedIn: true, activeAccount: {accountHash: 'account'}, sessionEpoch: 1},
    deeplink: {id: 'generic', data: 'aa', requestId: 1, passthrough: {pendingDeeplinkId: 'saved-gift'}}};
  mockDispatch.mockImplementation(action => {mockState = {...mockState, deeplink: deeplink(mockState.deeplink, action)};});
  mockEncrypt.mockResolvedValue(undefined);
  mockSign.mockResolvedValue(new GenericResponse());
  mockVerify.mockResolvedValue(true);
  mockPost.mockResolvedValue({});
  mockMarkComplete.mockResolvedValue(undefined);
});
afterEach(() => act(() => views.forEach(view => view.unmount())));

it('delivers a current response once and clears only its request after completion', async () => {
  const {complete, navigation} = mount();
  await act(async () => {await Promise.all([complete(), complete()]);});
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockPost).toHaveBeenCalledTimes(1);
  expect(mockMarkComplete).toHaveBeenCalledWith('saved-gift');
  expect(mockState.deeplink).toMatchObject({id: null, data: {}});
  expect(navigation.dispatch).toHaveBeenCalledTimes(1);
});

it.each(['encrypt', 'sign', 'verify', 'post'])('stops completion after unmount while %s is pending', async phase => {
  const wait = deferred();
  const methods = {encrypt: mockEncrypt, sign: mockSign, verify: mockVerify, post: mockPost};
  methods[phase].mockReturnValueOnce(wait.promise);
  const {view, complete, navigation} = mount();
  let pending;
  await act(async () => {pending = complete(); await Promise.resolve(); await Promise.resolve();});
  act(() => view.unmount());
  views.delete(view);
  await act(async () => {wait.resolve(phase === 'sign' ? new GenericResponse() : true); await pending;});
  expect(mockPost).toHaveBeenCalledTimes(phase === 'post' ? 1 : 0);
  expect(mockMarkComplete).not.toHaveBeenCalled();
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(mockAlert).not.toHaveBeenCalled();
  expect(navigation.dispatch).not.toHaveBeenCalled();
});

it.each(['replacement', 'session'])('does not deliver or clear an old request after %s changes during signing', async change => {
  const wait = deferred();
  mockSign.mockReturnValueOnce(wait.promise);
  const {complete, navigation} = mount();
  let pending;
  await act(async () => {pending = complete(); await Promise.resolve();});
  if (change === 'replacement') mockState.deeplink = {...mockState.deeplink, requestId: 2};
  else mockState.authentication = {...mockState.authentication, sessionEpoch: 2};
  await act(async () => {wait.resolve(new GenericResponse()); await pending;});
  expect(mockPost).not.toHaveBeenCalled();
  expect(mockMarkComplete).not.toHaveBeenCalled();
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(mockAlert).not.toHaveBeenCalled();
  expect(navigation.dispatch).not.toHaveBeenCalled();
});

it('resets a mounted replacement response while an old completion is pending', async () => {
  const oldEncryption = deferred();
  const newSignature = deferred();
  mockEncrypt.mockReturnValueOnce(oldEncryption.promise);
  const {view, complete, navigation} = mount();
  let oldPending;
  await act(async () => {oldPending = complete();});
  expect(view.root.findAllByType('GradientButton')).toHaveLength(0);

  mockState.deeplink = {...mockState.deeplink, data: 'cc', requestId: 2};
  await act(async () => view.update(<Complete route={{params: {requestBufferString: 'cc', responseBufferString: 'dd'}}} navigation={navigation} />));
  const nextComplete = view.root.findByType('GradientButton').props.onPress;
  mockSign.mockReturnValueOnce(newSignature.promise);
  let newPending;
  await act(async () => {newPending = nextComplete();});
  await act(async () => {oldEncryption.resolve(); await oldPending;});
  await act(async () => nextComplete());
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockPost).not.toHaveBeenCalled();
  await act(async () => {newSignature.resolve(new GenericResponse()); await newPending;});
  expect(mockPost).toHaveBeenCalledTimes(1);
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  expect(mockDispatch.mock.calls[0][0].payload.expectedRequestId).toBe(2);
  expect(navigation.dispatch).toHaveBeenCalledTimes(1);
});

it('waits for replacement URL parsing, then returns the nested stack to verification', async () => {
  const {StackRouter, CommonActions} = jest.requireActual('@react-navigation/routers');
  const rootRouter = StackRouter({initialRouteName: 'SignedInStack'});
  const rootOptions = {routeNames: ['SignedInStack', 'DeepLink'], routeParamList: {}, routeGetIdList: {}};
  const childRouter = StackRouter({initialRouteName: 'VerifyDeepLink'});
  const childOptions = {routeNames: ['VerifyDeepLink', 'GenericRequestComplete'], routeParamList: {}, routeGetIdList: {}};
  let root = rootRouter.getInitialState(rootOptions);
  root = rootRouter.getStateForAction(root, CommonActions.navigate('DeepLink'), rootOptions);
  let child = childRouter.getInitialState(childOptions);
  child = childRouter.getStateForAction(child, CommonActions.navigate('GenericRequestComplete', {
    requestBufferString: 'aa', responseBufferString: 'bb',
  }), childOptions);
  root.routes[root.index].state = child;
  const {view, complete} = mount();
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
  expect(child.routes[child.index].name).toBe('GenericRequestComplete');

  mockState.deeplink = {...mockState.deeplink, data: 'cc', requestId: 2, parsingUrl: false};
  await act(async () => stack.update(<SignedInStack navigation={navigation} />));
  expect(navigation.navigate).toHaveBeenCalledWith('DeepLink', {screen: 'VerifyDeepLink'});
  expect(child.routes.map(route => route.name)).toEqual(['VerifyDeepLink']);
  expect(mockState.deeplink).toMatchObject({data: 'cc', requestId: 2, url: null});

  // An already-captured old completion callback still cannot deliver or clear it.
  act(() => view.unmount());
  views.delete(view);
  mockDispatch.mockClear();
  await act(async () => complete());
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockPost).not.toHaveBeenCalled();
  expect(mockDispatch).not.toHaveBeenCalled();
});
