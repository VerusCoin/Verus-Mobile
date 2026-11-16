let mockState;
const mockValidate = jest.fn();
const mockAlert = jest.fn();
const mockUnlock = jest.fn();
const mockDispatch = jest.fn();
const mockRenderGeneric = jest.fn();

jest.mock('react-native', () => require('../../../tests/helpers/mockReactNative')({View: 'View'}));
jest.mock('@react-navigation/native', () => ({
  CommonActions: {reset: value => ({type: 'RESET', ...value})},
  useFocusEffect: effect => require('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-paper', () => ({...jest.requireActual('react-native-paper'), Portal: 'Portal'}));
jest.mock('react-redux', () => require('../../../tests/helpers/mockReactRedux')({useSelector: selector => selector(mockState), useDispatch: () => mockDispatch}));
jest.mock('../../../hooks/useObjectSelector', () => ({useObjectSelector: selector => selector(mockState)}));
jest.mock('../../../selectors/authentication', () => ({selectHasAuthenticatedSession: state => state.authentication.signedIn}));
jest.mock('../../../store', () => ({getState: () => mockState}));
jest.mock('../../../components/AnimatedActivityIndicatorBox', () => 'Loading');
jest.mock('../../../containers/DeepLink/LoginRequestInfo/LoginRequestInfo', () => 'LoginRequestInfo');
jest.mock('../../../containers/DeepLink/InvoiceInfo/InvoiceInfo', () => 'InvoiceInfo');
jest.mock('../../../containers/DeepLink/GenericRequestHome/GenericRequestHome', () => props => {
  mockRenderGeneric(props);
  return require('react').createElement('GenericRequestHome', props);
});
jest.mock('verusid-ts-client', () => ({primitives: {
  IDENTITY_VIEW: {vdxfid: 'identity-view'},
  VERUSPAY_INVOICE_VDXF_KEY: {vdxfid: 'invoice'},
  GENERIC_REQUEST_DEEPLINK_VDXF_KEY: {vdxfid: 'generic'},
  LOGIN_CONSENT_REQUEST_VDXF_KEY: {vdxfid: 'login'},
  IDENTITY_UPDATE_REQUEST_VDXF_KEY: {vdxfid: 'identity'},
  GenericRequest: class {
    fromBuffer(bytes) {
      this.marker = bytes.toString();
      this.details = this.marker === 'upload'
        ? [{getIAddressKey: () => 'identity', data: {signDataMap: new Map([['content-key', {}]])}}]
        : [];
    }
    isTestnet() { return false; }
    isSigned() { return ['delegated', 'self-scoped', 'upload'].includes(this.marker); }
    hasAppOrDelegatorID() { return ['delegated', 'self-scoped', 'unsigned-scoped'].includes(this.marker); }
    appOrDelegatorID = {toIAddress: () => this.marker === 'self-scoped' ? 'signing-app' : 'delegated-user'};
    signature = {identityID: {toIAddress: () => 'signing-app'}};
  },
}}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({createAlert: (...args) => mockAlert(...args)}));
jest.mock('../../../actions/actions/walletUnlock/dispatchers/walletUnlock', () => ({
  requestWalletUnlock: (...args) => mockUnlock(...args), WALLET_UNLOCK_CANCELLED: 'WALLET_UNLOCK_CANCELLED',
}));
jest.mock('../../../actions/actionCreators', () => ({resetDeeplinkData: requestId => ({type: 'RESET_DEEPLINK', ...(requestId == null ? {} : {expectedRequestId: requestId})})}));
jest.mock('../../vrpc/vrpcInterface', () => ({initEndpoint: jest.fn()}));
jest.mock('../../api/channels/vrpc/callCreators', () => ({getInfo: async () => ({result: {blocks: 100, chainid: 'system-id'}})}));
jest.mock('../../api/channels/verusid/callCreators', () => ({}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {
  getBasicCoinObj: () => ({id: 'VRSC', system_id: 'system-id', vrpc_endpoints: ['http://unused.invalid']}),
}}));
jest.mock('../../fullyqualifiedname', () => ({convertFqnToDisplayFormat: value => value}));
jest.mock('../../math', () => ({}));
jest.mock('../../deeplink/validator/envelopeValidator', () => ({validateGenericRequest: (...args) => mockValidate(...args)}));
jest.mock('../../deeplink/experimentalDeeplinks', () => ({assertExperimentalGenericRequestAllowed: jest.fn()}));
jest.mock('../../deeplink/verusPayBurnChangePrice', () => ({}));
jest.mock('../../deeplink/requestAccounts', () => ({assertRequestNetworkMatchesAccount: jest.fn()}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const DeepLink = require('../../../containers/DeepLink/DeepLink').default;
const hex = value => Buffer.from(value).toString('hex');
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
};
let props, views;
const mount = async () => {
  let view;
  await act(async () => { view = create(<DeepLink {...props} />); });
  views.add(view);
  return view;
};
const unmount = view => { act(() => view.unmount()); views.delete(view); };
const replace = async (view, marker = 'replacement') => {
  mockState = {...mockState, deeplink: {id: 'generic', data: hex(marker), requestId: mockState.deeplink.requestId + 1}};
  await act(async () => { view.update(<DeepLink {...props} />); });
};
const rawText = node => typeof node === 'string' ? node : (node.children || []).map(rawText).join('');
// A request that ends resets only its own id, so the reducer ignores the reset once a replacement is current.
const dispatchedActions = () => mockDispatch.mock.calls.map(([action]) => action).filter(action => action.type !== 'REMOVE_MODAL');
const expectNoOldEffects = (closed = false) => {
  expect(mockAlert).not.toHaveBeenCalled();
  const dispatched = dispatchedActions();
  if (closed) expect(dispatched).toContainEqual({type: 'RESET_DEEPLINK', expectedRequestId: 1});
  else dispatched.forEach(action => expect(action).toEqual({type: 'RESET_DEEPLINK', expectedRequestId: 1}));
  expect(props.navigation.dispatch).not.toHaveBeenCalled();
};

beforeEach(() => {
  jest.clearAllMocks();
  mockValidate.mockReset().mockResolvedValue(true);
  mockUnlock.mockReset().mockResolvedValue(undefined);
  props = {navigation: {dispatch: jest.fn(), addListener: jest.fn(() => jest.fn())}};
  views = new Set();
  mockState = {deeplink: {id: 'generic', data: hex('original'), requestId: 1},
    authentication: {signedIn: true, accounts: [{testnetOverrides: {}}], activeAccount: {testnetOverrides: {}}},
    alert: {active: false}, sendModal: {visible: false, type: null}, modal: {stack: []}};
});
afterEach(() => {
  views.forEach(view => act(() => view.unmount()));
  jest.useRealTimers();
});

it.each(['resolve', 'reject'])('ignores an old generic validation %s after a replacement is displayed', async outcome => {
  const old = deferred();
  mockValidate.mockReturnValueOnce(old.promise);
  const view = await mount();
  expect(mockRenderGeneric).not.toHaveBeenCalled();
  await replace(view);
  expect(view.root.findByType('GenericRequestHome').props.deeplinkData).toBe(hex('replacement'));
  await act(async () => old[outcome](outcome === 'reject' ? new Error('Obsolete validation failed') : true));
  expect(mockValidate.mock.calls.map(([request]) => request.marker)).toEqual(['original', 'replacement']);
  expect(mockRenderGeneric.mock.calls.every(([screen]) => screen.deeplinkData === hex('replacement'))).toBe(true);
  expectNoOldEffects();
});

it.each(['resolve', 'reject'])('ignores a pending generic validation %s after unmount', async outcome => {
  const old = deferred();
  mockValidate.mockReturnValueOnce(old.promise);
  const view = await mount();
  unmount(view);
  await act(async () => old[outcome](outcome === 'reject' ? new Error('Unmounted validation failed') : true));
  expect(mockRenderGeneric).not.toHaveBeenCalled();
  expectNoOldEffects(true);
});

it.each(['replace', 'unmount'])('ignores a late delegated sign-in unlock after %s', async change => {
  const unlock = deferred();
  mockUnlock.mockReturnValueOnce(unlock.promise);
  mockState.authentication.signedIn = false;
  mockState.deeplink.data = hex('delegated');
  const view = await mount();
  expect(mockUnlock).toHaveBeenCalledTimes(1);
  expect(mockValidate).not.toHaveBeenCalled();
  if (change === 'replace') await replace(view);
  else unmount(view);
  await act(async () => unlock.resolve());
  expectNoOldEffects(change === 'unmount');
  if (change === 'replace') {
    expect(view.root.findByType('GenericRequestHome').props.deeplinkData).toBe(hex('replacement'));
    expect(mockRenderGeneric.mock.calls.every(([screen]) => screen.deeplinkData === hex('replacement'))).toBe(true);
  } else expect(mockRenderGeneric).not.toHaveBeenCalled();
});

it.each(['delegated', 'self-scoped', 'upload'])('opens the current %s sign-in prompt once and validates after sign-in', async marker => {
  const unlock = deferred();
  mockUnlock.mockReturnValueOnce(unlock.promise);
  mockState.authentication.signedIn = false;
  mockState.deeplink.data = hex(marker);
  const view = await mount();
  expect(mockUnlock).toHaveBeenCalledTimes(1);
  expect(mockUnlock).toHaveBeenCalledWith(expect.objectContaining({reason: 'delegated-signer-verification'}));
  expect(mockValidate).not.toHaveBeenCalled();
  await act(async () => unlock.resolve());
  expect(mockUnlock).toHaveBeenCalledTimes(1);
  expect(mockValidate).toHaveBeenCalledTimes(1);
  expect(view.root.findByType('GenericRequestHome').props.deeplinkData).toBe(hex(marker));
  expectNoOldEffects();
});

it('rejects an unsigned explicit scope without requesting sign-in', async () => {
  mockState.authentication.signedIn = false;
  mockState.deeplink.data = hex('unsigned-scoped');
  mockValidate.mockRejectedValueOnce(new Error('This type of request requires a signature'));
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const view = await mount();
    expect(mockValidate).toHaveBeenCalledTimes(1);
    expect(mockUnlock).not.toHaveBeenCalled();
    expect(rawText(view.root)).toContain('Cannot open request');
    expect(rawText(view.root)).not.toContain('requires a signature');
    expect(view.root.findAllByType('GenericRequestHome')).toHaveLength(0);
  } finally {
    warn.mockRestore();
  }
});

it('does not resume an old delegated request when sign-in and replacement arrive together', async () => {
  mockUnlock.mockReturnValueOnce(deferred().promise);
  mockState.authentication.signedIn = false;
  mockState.deeplink.data = hex('delegated');
  const view = await mount();
  mockState = {...mockState, authentication: {...mockState.authentication, signedIn: true},
    deeplink: {id: 'generic', data: hex('replacement'), requestId: mockState.deeplink.requestId + 1}};
  await act(async () => view.update(<DeepLink {...props} />));
  expect(mockValidate.mock.calls.map(([request]) => request.marker)).toEqual(['replacement']);
  expect(mockUnlock).toHaveBeenCalledTimes(1);
  expect(view.root.findByType('GenericRequestHome').props.deeplinkData).toBe(hex('replacement'));
  expectNoOldEffects();
});

it('rejects an unsupported standalone identity-update protocol without processing it', async () => {
  mockState.deeplink = {id: 'identity', data: {details: {identity: {}}}, requestId: 1};
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const view = await mount();
    expect(rawText(view.root)).toContain('Unsupported request');
    expect(mockValidate).not.toHaveBeenCalled();
    expect(view.root.findAllByType('GenericRequestHome')).toHaveLength(0);
    await act(async () => view.root.findAll(node => node.props.onPress && rawText(node) === 'Close')[0].props.onPress());
    expect(mockDispatch).toHaveBeenCalledWith({type: 'RESET_DEEPLINK', expectedRequestId: 1});
  } finally {
    warn.mockRestore();
  }
});

it('a signed-out upload without a matching profile does not reach the local preview handler', async () => {
  mockState.authentication.signedIn = false;
  mockState.authentication.activeAccount = null;
  mockState.authentication.accounts = [];
  mockState.deeplink.data = hex('upload');
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const view = await mount();
    expect(mockValidate).not.toHaveBeenCalled();
    expect(mockRenderGeneric).not.toHaveBeenCalled();
    expect(rawText(view.root)).toContain('No mainnet wallet');
    expect(rawText(view.root)).toContain('This request needs a mainnet wallet. Add one, then open the request again.');
  } finally {
    warn.mockRestore();
  }
});

it('clears the current request on flow removal while preserving an identical replacement', async () => {
  const view = await mount();
  const oldRequestId = mockState.deeplink.requestId;
  mockState = {...mockState, deeplink: {...mockState.deeplink, requestId: oldRequestId + 1}};
  unmount(view);
  expect(dispatchedActions()).toEqual([{type: 'RESET_DEEPLINK', expectedRequestId: oldRequestId}]);
});

it('leaves a cleared flow quietly after sign-out instead of showing unsupported-request errors', async () => {
  const view = await mount();
  mockState = {...mockState, authentication: {...mockState.authentication, signedIn: false},
    deeplink: {id: null, data: {}, requestId: 2}};
  await act(async () => view.update(<DeepLink {...props} />));
  expect(mockAlert).not.toHaveBeenCalled();
  expect(dispatchedActions()).toEqual([{type: 'RESET_DEEPLINK', expectedRequestId: 1}]);
  expect(props.navigation.dispatch).toHaveBeenCalledWith(expect.objectContaining({routes: [{name: 'SignedOutStack'}]}));
});
