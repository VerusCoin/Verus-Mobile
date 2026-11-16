let mockState;
let mockSignerSystemID;
const mockDispatch = jest.fn();
const mockEncrypt = jest.fn();
const mockSign = jest.fn();
const mockVerify = jest.fn();
const mockPost = jest.fn();
const mockAlert = jest.fn();
const mockCoinLookup = jest.fn();

jest.mock('@react-navigation/native', () => ({CommonActions: {reset: payload => ({type: 'RESET', ...payload})}}));
jest.mock('@react-navigation/drawer', () => ({createDrawerNavigator: () => ({Navigator: 'Drawer', Screen: 'Screen'})}));
jest.mock('../../../containers/SideMenu/SideMenu', () => 'SideMenu');
jest.mock('../../../containers/RootStack/MainStackScreens/MainStackScreens', () => 'MainStack');
jest.mock('react-redux', () => ({useSelector: selector => selector(mockState), useDispatch: () => mockDispatch,
  useStore: () => ({getState: () => mockState})}));
jest.mock('../../../store', () => ({getState: () => mockState}));
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
  GenericRequest: class {
    fromBuffer(bytes) {
      this.details = bytes.toString() === 'encryption' ? [{getIAddressKey: () => 'app-encryption'}] : [];
    }
    details = [];
    responseURIs = [{type: 1, getUriString: () => 'https://example.invalid/response'}];
    hasEncryptResponseToAddress() { return false; }
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
const {createGenericRequestDeliverySingleFlight} = require('../../../containers/DeepLink/GenericRequestHome/genericRequestCompletionFlow');
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
});
afterEach(() => act(() => views.forEach(view => view.unmount())));

it('delivers a current response once', async () => {
  const flight = createGenericRequestDeliverySingleFlight();
  const deliver = createGenericResponseDelivery();
  const attempt = () => flight.tryStart() ? start(openRequest(), {}, deliver).pending : null;
  const [result] = await Promise.all([attempt(), attempt()]);
  expect(result.type).toBe('post');
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockPost).toHaveBeenCalledTimes(1);
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

it.each(['encrypt', 'sign', 'verify', 'post'])('stops completion after the request closes while %s is pending', async phase => {
  const wait = deferred();
  const methods = {encrypt: mockEncrypt, sign: mockSign, verify: mockVerify, post: mockPost};
  methods[phase].mockReturnValueOnce(wait.promise);
  const {request, pending} = start();
  const settled = pending.catch(() => {});
  await act(async () => {await Promise.resolve(); await Promise.resolve();});
  request.closed = true;
  await act(async () => {wait.resolve(phase === 'sign' ? new GenericResponse() : true); await settled;});
  expect(mockPost).toHaveBeenCalledTimes(phase === 'post' ? 1 : 0);
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(mockAlert).not.toHaveBeenCalled();
});

it.each(['replacement', 'session'])('does not deliver an old request after %s changes during signing', async change => {
  const wait = deferred();
  mockSign.mockReturnValueOnce(wait.promise);
  const {request, pending} = start();
  const settled = pending.catch(() => {});
  await act(async () => {await Promise.resolve();});
  if (change === 'replacement') request.closed = true;
  else mockState.authentication = {...mockState.authentication, sessionEpoch: 2};
  await act(async () => {wait.resolve(new GenericResponse()); await settled;});
  await expect(pending).rejects.toThrow();
  expect(mockPost).not.toHaveBeenCalled();
  expect(mockDispatch).not.toHaveBeenCalled();
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
  const {request: oldRequest, pending: oldPending} = start();
  const oldSettled = oldPending.catch(() => {});
  await act(async () => {await Promise.resolve();});
  expect(mockSign).not.toHaveBeenCalled();

  oldRequest.closed = true;
  mockState.deeplink = {...mockState.deeplink, data: 'cc', requestId: 2};
  mockSign.mockReturnValueOnce(newSignature.promise);
  const {pending: newPending} = start(openRequest(), {requestBufferString: 'cc', responseBufferString: 'dd'});
  await act(async () => {oldEncryption.resolve(); await oldSettled;});
  await expect(oldPending).rejects.toThrow('Request closed');
  expect(mockSign).toHaveBeenCalledTimes(1);
  expect(mockPost).not.toHaveBeenCalled();
  await act(async () => {newSignature.resolve(new GenericResponse()); await newPending;});
  expect(mockPost).toHaveBeenCalledTimes(1);
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
  const oldEncryption = deferred();
  mockEncrypt.mockReturnValueOnce(oldEncryption.promise);
  const oldRequest = openRequest();
  const {pending: oldPending} = start(oldRequest);
  const oldSettled = oldPending.catch(() => {});
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

  // The closed request's delivery still cannot sign, deliver or clear anything.
  oldRequest.closed = true;
  mockDispatch.mockClear();
  await act(async () => {oldEncryption.resolve(); await oldSettled;});
  await expect(oldPending).rejects.toThrow();
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockPost).not.toHaveBeenCalled();
  expect(mockDispatch).not.toHaveBeenCalled();
});
