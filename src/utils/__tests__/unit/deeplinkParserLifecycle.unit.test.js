const mockSave = jest.fn();
const mockInstalled = jest.fn();
const mockAlert = jest.fn();
const mockPreferred = jest.fn();
jest.mock('react-native', () => ({Alert: {alert: jest.fn()}, Linking: {openURL: jest.fn()},
  unstable_batchedUpdates: callback => callback()}));
jest.mock('react-native-url-polyfill', () => ({URL: require('url').URL}));
jest.mock('@react-navigation/drawer', () => ({createDrawerNavigator: () => ({Navigator: 'Drawer', Screen: 'Screen'})}));
jest.mock('../../../containers/SideMenu/SideMenu', () => 'SideMenu');
jest.mock('../../../containers/RootStack/MainStackScreens/MainStackScreens', () => 'MainStack');
jest.mock('../../../actions/actionCreators', () => jest.requireActual('../../../actions/actions/deeplink/creators/deeplink'));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({createAlert: (...args) => mockAlert(...args)}));
jest.mock('../../constants/constants', () => ({CALLBACK_HOST: 'callback', SUPPORTED_DLS: []}));
jest.mock('../../deeplink/isDeeplinkHandlerInstalled', () => ({isDeeplinkHandlerInstalled: (...args) => mockInstalled(...args)}));
jest.mock('../../deeplink/pendingDeeplinkStorage', () => ({
  savePendingDeeplinkRequest: (...args) => mockSave(...args),
  getPendingDeeplinkPassthrough: saved => saved ? {pendingDeeplinkId: saved.id} : null,
}));
jest.mock('verusid-ts-client', () => ({primitives: {}}));
jest.mock('verus-typescript-primitives', () => ({
  DEEPLINK_PROTOCOL_URL_STRING: 'verus', GENERIC_REQUEST_DEEPLINK_VDXF_KEY: {vdxfid: 'generic'},
  VALU_MOBILE_GENERIC_REQUEST_HANDLER_ID: 'valu', VERUS_MOBILE_GENERIC_REQUEST_HANDLER_ID: 'mobile',
  GenericRequest: {fromWalletDeeplinkUri: uri => ({
    hasPreferredHandler: () => mockPreferred(), preferredHandler: 'valu', toBuffer: () => Buffer.from(uri),
  })},
}));

const {runSaga, stdChannel} = jest.requireActual('redux-saga');
const {Alert, Linking} = require('react-native');
const saga = require('../../../sagas/deeplink').default;
const {deeplink} = require('../../../reducers/deeplink');
const {shouldRejectSessionAction} = require('../../../reducers/sessionScope');
const {setDeeplinkUrl, setDeeplinkData, resetDeeplinkData} = require('../../../actions/actions/deeplink/creators/deeplink');
const {SIGN_OUT, SET_DEEPLINK_DATA} = require('../../constants/storeType');
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
};
let state, task, dispatch, emitted;

beforeEach(() => {
  jest.clearAllMocks();
  mockInstalled.mockResolvedValue(false);
  mockSave.mockResolvedValue(null);
  mockPreferred.mockReturnValue(false);
  state = {authentication: {activeAccount: {accountHash: 'account'}, sessionEpoch: 1},
    deeplink: deeplink(undefined, {type: 'INIT'})};
  emitted = [];
  const channel = stdChannel();
  dispatch = action => {
    if (shouldRejectSessionAction(state, action)) return;
    state = {...state, deeplink: deeplink(state.deeplink, action)};
    if (action.type === SIGN_OUT) {
      state.authentication = {activeAccount: null, sessionEpoch: state.authentication.sessionEpoch + 1};
    }
    channel.put(action);
  };
  task = runSaga({channel, getState: () => state,
    dispatch: action => {emitted.push(action); dispatch(action);}}, saga);
});
afterEach(async () => {task.cancel(); await task.toPromise();});

it('publishes the current request after storage and preserves its passthrough', async () => {
  const pending = deferred();
  mockSave.mockReturnValueOnce(pending.promise);
  dispatch(setDeeplinkData('generic', 'previous-request'));
  dispatch(setDeeplinkUrl('verus://request', {fromNfc: true}));
  await flush();
  expect(state.deeplink).toMatchObject({data: 'previous-request', parsingUrl: true});
  expect(emitted).toHaveLength(0);
  pending.resolve({id: 'saved-key'});
  await flush();
  expect(state.deeplink).toMatchObject({data: Buffer.from('verus://request').toString('hex'), parsingUrl: false,
    passthrough: {fromNfc: true, pendingDeeplinkId: 'saved-key'}});
  expect(emitted[0].meta).toMatchObject({sessionScoped: true, accountHash: 'account', sessionEpoch: 1});
  dispatch(setDeeplinkUrl(null));
  expect(state.deeplink.data).toBe(Buffer.from('verus://request').toString('hex'));
});

it.each(['close', 'sign-out', 'session', 'direct replacement'])('discards delayed storage completion after %s', async change => {
  const pending = deferred();
  mockSave.mockReturnValueOnce(pending.promise);
  dispatch(setDeeplinkUrl('verus://old'));
  await flush();
  if (change === 'close') dispatch(resetDeeplinkData(state.deeplink.requestId));
  if (change === 'sign-out') dispatch({type: SIGN_OUT});
  if (change === 'session') state.authentication = {...state.authentication, sessionEpoch: 2};
  if (change === 'direct replacement') dispatch(setDeeplinkData('generic', 'new-request'));
  const unchanged = state.deeplink;
  pending.resolve({id: 'old-key'});
  await flush();
  expect(state.deeplink).toBe(unchanged);
  expect(emitted).toHaveLength(0);
  expect(mockAlert).not.toHaveBeenCalled();
});

it.each(['verus://new', 'verus://old'])('only publishes the latest URL parser, including repeated identical URLs (%s)', async nextUrl => {
  const pending = deferred();
  mockSave.mockReturnValueOnce(pending.promise);
  dispatch(setDeeplinkUrl('verus://old'));
  await flush();
  dispatch(setDeeplinkUrl(nextUrl));
  await flush();
  const latest = state.deeplink;
  pending.resolve({id: 'old-key'});
  await flush();
  expect(state.deeplink).toBe(latest);
  expect(state.deeplink.data).toBe(Buffer.from(nextUrl).toString('hex'));
  expect(emitted.filter(action => action.type === SET_DEEPLINK_DATA)).toHaveLength(1);
});

it.each(['close', 'sign-out', 'replacement'])('ignores a late external-app confirmation after %s', async change => {
  mockInstalled.mockResolvedValue(true);
  mockPreferred.mockReturnValue(true);
  dispatch(setDeeplinkUrl('verus://old'));
  await flush();
  const confirm = Alert.alert.mock.calls[0][2][1].onPress;
  if (change === 'close') dispatch(resetDeeplinkData(state.deeplink.requestId));
  if (change === 'sign-out') dispatch({type: SIGN_OUT});
  if (change === 'replacement') {
    mockPreferred.mockReturnValue(false);
    dispatch(setDeeplinkUrl('verus://new'));
    await flush();
  }
  const previousEmissions = emitted.length;
  confirm();
  await flush();
  expect(Linking.openURL).not.toHaveBeenCalled();
  expect(emitted).toHaveLength(previousEmissions);
});

it('opens the preferred external app while the request is still current', async () => {
  mockInstalled.mockResolvedValue(true);
  mockPreferred.mockReturnValue(true);
  dispatch(setDeeplinkUrl('verus://current'));
  await flush();
  Alert.alert.mock.calls[0][2][1].onPress();
  await flush();
  expect(Linking.openURL).toHaveBeenCalledWith('verusvalu://current');
  expect(mockSave).not.toHaveBeenCalled();
});

it.each(['installation', 'storage'])('ignores a late %s error after the session changes', async phase => {
  const pending = deferred();
  (phase === 'installation' ? mockInstalled : mockSave).mockReturnValueOnce(pending.promise);
  dispatch(setDeeplinkUrl('verus://old'));
  await flush();
  state.authentication = {activeAccount: {accountHash: 'replacement'}, sessionEpoch: 2};
  pending.reject(new Error('old lookup failed'));
  await flush();
  expect(mockAlert).not.toHaveBeenCalled();
  expect(mockSave).toHaveBeenCalledTimes(phase === 'storage' ? 1 : 0);
  expect(emitted).toHaveLength(0);
});

it.each(['new URL', 'same URL', 'sign-out'])('does not consume a newer request when %s arrives before the navigation effect', async change => {
  const React = require('react');
  const {Provider} = require('react-redux');
  const {create, act} = require('react-test-renderer');
  const {createStore, applyMiddleware} = jest.requireActual('redux');
  const createSagaMiddleware = jest.requireActual('redux-saga').default;
  const SignedInStack = require('../../../containers/RootStack/SignedInStackScreens/SignedInStackScreens').default;
  const pending = deferred();
  mockSave.mockReturnValue(pending.promise);
  const middleware = createSagaMiddleware();
  const store = createStore((current, action) => ({...current, deeplink: deeplink(current.deeplink, action)}), {
    authentication: {activeAccount: {accountHash: 'account'}, sessionEpoch: 1},
    deeplink: {url: 'verus://previous', data: 'previous', id: 'generic', requestId: 1, parsingUrl: false},
  }, applyMiddleware(middleware));
  const parser = middleware.run(saga);
  const navigation = {navigate: jest.fn()};
  const url = change === 'same URL' ? 'verus://previous' : 'verus://replacement';

  function ChangeBeforePassiveEffects() {
    React.useLayoutEffect(() => {
      store.dispatch(change === 'sign-out' ? {type: SIGN_OUT} : setDeeplinkUrl(url));
    }, []);
    return <SignedInStack navigation={navigation} />;
  }

  let view;
  try {
    await act(async () => {
      view = create(<Provider store={store}><ChangeBeforePassiveEffects /></Provider>);
      await flush();
    });
    expect(navigation.navigate).not.toHaveBeenCalled();

    if (change === 'sign-out') {
      expect(store.getState().deeplink).toMatchObject({url: null, id: null});
      expect(mockSave).not.toHaveBeenCalled();
    } else {
      expect(store.getState().deeplink.url).toBe(url);
      expect(mockSave).toHaveBeenCalledTimes(1);
      await act(async () => {pending.resolve(null); await flush();});
      expect(store.getState().deeplink).toMatchObject({url: null, data: Buffer.from(url).toString('hex')});
      expect(navigation.navigate).toHaveBeenCalledTimes(1);
      expect(navigation.navigate).toHaveBeenCalledWith('DeepLink', {screen: 'VerifyDeepLink'});
    }
  } finally {
    if (view) act(() => view.unmount());
    parser.cancel();
    await parser.toPromise();
  }
});
