let mockState;
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetIdentity = jest.fn();
const mockUnlinkVerusId = jest.fn();
let mockHeaderRight = null;

jest.mock('react-native', () => require('../../../tests/helpers/mockReactNative')({
  Platform: {OS: 'ios'},
}));
jest.mock('react-redux', () => require('../../../tests/helpers/mockReactRedux')({
  useSelector: selector => selector(mockState),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    addListener: () => () => {},
    getState: () => ({index: 1, routes: [{key: 'list'}, {key: 'details'}]}),
    isFocused: () => true,
    setOptions: options => {
      if (typeof options?.headerRight === 'function') mockHeaderRight = options.headerRight;
    },
  }),
  useRoute: () => ({
    key: 'details',
    params: {chain: 'VRSCTEST', iAddress: 'iAlice', displayName: 'alice.VRSCTEST@'},
  }),
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../../components/SemiModal', () => 'SemiModal');
// The real sheet runs its close animation on the native driver. The stand-in
// keeps the sheet's props on a host element, shows the children only while
// the sheet is visible, and lets a test fire onClosed after the sheet hides.
jest.mock('../../../components/BottomSheetModal', () => {
  const mockReact = require('react');
  return ({visible, onClose, onClosed, children}) =>
    mockReact.createElement('BottomSheetModal', {visible, onClose, onClosed}, visible ? children : null);
});
jest.mock('../../../store', () => ({__esModule: true, default: {getState: () => mockState}}));
jest.mock('../../../actions/actionCreators', () => ({
  ...jest.requireActual('../../../actions/actionCreators'),
  setServiceLoading: jest.fn(() => ({type: 'SET_SERVICE_LOADING'})),
  setUserCoins: jest.fn(activeCoins => ({type: 'SET_USER_COINS', payload: {activeCoinsForUser: activeCoins}})),
}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({createAlert: jest.fn(), resolveAlert: jest.fn()}));
jest.mock('../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager', () => ({updateVerusIdWallet: jest.fn(() => Promise.resolve())}));
jest.mock('../../../actions/actions/intervals/dispatchers/lifecycleManager', () => ({clearChainLifecycle: jest.fn(), refreshActiveChainLifecycles: jest.fn()}));
jest.mock('../../../actions/actions/sendModal/dispatchers/sendModal', () => ({openLinkIdentityModal: jest.fn()}));
jest.mock('../../../actions/actions/services/dispatchers/verusid/verusid', () => ({
  unlinkVerusId: (...args) => mockUnlinkVerusId(...args),
  linkVerusId: jest.fn(),
  checkVerusIdNotificationsForUpdates: jest.fn(),
  deleteProvisionedIds: jest.fn(),
}));
jest.mock('../../api/channels/verusid/callCreators', () => ({getIdentity: (...args) => mockGetIdentity(...args), getFriendlyNameMap: jest.fn(() => Promise.resolve({}))}));
jest.mock('../../api/channels/verusid/requests/getIdentityContent', () => ({getIdentityContent: jest.fn(() => Promise.resolve(null))}));
jest.mock('../../api/channels/vrpc/requests/getInfo', () => ({getInfo: jest.fn(() => Promise.resolve({result: {longestchain: 100}}))}));
jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: {
    findCoinObj: jest.fn(() => ({id: 'VRSCTEST', system_id: 'iVRSCTEST'})),
    getBasicCoinObj: jest.fn(() => ({system_id: 'iVRSCTEST'})),
  },
}));
jest.mock('../../../containers/Services/ServiceComponents/VerusIdService/VerusIdServiceOverview/VerusIdServiceOverview.render', () => ({VerusIdServiceOverviewRender: jest.fn()}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {Platform, Pressable} = require('react-native');
const {VerusIdServiceOverview} = require('../../../containers/Services/ServiceComponents/VerusIdService/VerusIdServiceOverview/VerusIdServiceOverview');
const SignedInVerusIdDetails = require('../../../containers/Services/ServiceComponents/VerusIdService/SignedInVerusIdDetails').default;
const IdentityActionsModal = require('../../../containers/Services/ServiceComponents/VerusIdService/VerusIdServiceOverview/IdentityActionsModal').default;

const iAddress = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const stateFor = (accountHash = 'alice', sessionEpoch = 1) => ({
  authentication: {
    activeAccount: {id: accountHash, accountHash, keys: {VRSCTEST: {vrpc: {addresses: ['RWalletAddress000000000000000000000000']}}}},
    sessionEpoch,
  },
  coins: {activeCoinList: ['VRSCTEST'], activeCoinsForUser: [], showBalance: true},
  coinMenus: {allSubWallets: {}},
  ledger: {balances: {}},
  alert: {active: null},
});
const overview = () => new VerusIdServiceOverview({
  activeAccount: mockState.authentication.activeAccount,
  sessionEpoch: mockState.authentication.sessionEpoch,
  navigation: {navigate: mockNavigate},
});

beforeEach(() => {
  jest.clearAllMocks();
  mockState = stateFor();
  mockHeaderRight = null;
  Platform.OS = 'ios';
  mockGetIdentity.mockResolvedValue({
    error: null,
    result: {fullyqualifiedname: 'alice.VRSCTEST@', identity: {identityaddress: 'iAlice', name: 'alice', primaryaddresses: []}},
  });
  mockUnlinkVerusId.mockResolvedValue(undefined);
});

test('linking opens the multi-selection page on the selected identity network', () => {
  const instance = overview();
  instance.openLinkIdentitiesFromChain('VRSCTEST');
  expect(mockNavigate).toHaveBeenCalledWith('IdentityTab', {screen: 'LinkIdentities', params: {chain: 'VRSCTEST'}});
});

// The VerusID page (SignedInVerusIdDetails) owns the identity actions. Its
// options sheet runs a chosen action after the sheet has finished closing.
const flush = () => act(async () => {
  await Promise.resolve();
  await Promise.resolve();
});
const find = (view, label) => view.root.findAll(node => node.props?.accessibilityLabel === label)[0];
// Page order: options sheet first, unlink sheet last.
const optionsSheet = view => view.root.findAllByType('BottomSheetModal')[0];
const unlinkSheet = view => view.root.findAllByType('BottomSheetModal').slice(-1)[0];
const closeSheet = (sheet) => act(async () => sheet.props.onClosed());

const renderPage = async () => {
  let view;
  await act(async () => {view = create(<SignedInVerusIdDetails />);});
  await flush();
  return view;
};
const openOptions = async () => {
  // The options button is installed through navigation.setOptions.
  const HeaderActions = () => mockHeaderRight();
  let header;
  await act(async () => {header = create(<HeaderActions />);});
  await act(async () => {find(header, 'VerusID options').props.onPress();});
  await flush();
};
const choose = (view, label) => act(async () => {find(view, label).props.onPress();});
const pageParams = displayName => ({chain: 'VRSCTEST', identityAddress: 'iAlice', displayName});

test.each([['transfer', 'Transfer VerusID', 'IdentityTransfer'], ['modify', 'Modify VerusID', 'IdentityModify']])(
  '%s opens the correct identity screen after the native sheet has dismissed',
  async (action, label, screen) => {
    const view = await renderPage();
    await openOptions();
    const loads = mockGetIdentity.mock.calls.length;
    await choose(view, label);
    expect(optionsSheet(view).props.visible).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
    await closeSheet(optionsSheet(view));
    await closeSheet(optionsSheet(view));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('IdentityManagement', {screen, params: pageParams('alice.VRSCTEST@')});
    expect(mockGetIdentity).toHaveBeenCalledTimes(loads);
  },
);

test('a second tap during the close cannot replace the intended action', async () => {
  const view = await renderPage();
  await openOptions();
  const pressUnlinkRow = find(view, 'Unlink VerusID').props.onPress;
  await choose(view, 'Transfer VerusID');
  await act(async () => {pressUnlinkRow();});
  await closeSheet(optionsSheet(view));
  expect(unlinkSheet(view).props.visible).toBe(false);
  expect(mockNavigate).toHaveBeenCalledTimes(1);
});

test('unlink retains the selected identity and original account scope', async () => {
  const view = await renderPage();
  await openOptions();
  await choose(view, 'Unlink VerusID');
  expect(unlinkSheet(view).props.visible).toBe(false);
  await closeSheet(optionsSheet(view));
  expect(unlinkSheet(view).props.visible).toBe(true);
  expect(mockUnlinkVerusId).not.toHaveBeenCalled();
  await choose(view, 'Unlink alice.VRSCTEST@');
  await flush();
  expect(mockUnlinkVerusId).toHaveBeenCalledWith('iAlice', 'VRSCTEST', {sessionScope: expect.any(Object)});
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('cancel closes the chooser without taking an identity action', async () => {
  const view = await renderPage();
  await openOptions();
  await act(async () => {optionsSheet(view).props.onClose();});
  await closeSheet(optionsSheet(view));
  expect(optionsSheet(view).props.visible).toBe(false);
  expect(unlinkSheet(view).props.visible).toBe(false);
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(mockUnlinkVerusId).not.toHaveBeenCalled();
});

test.each([['transfer', 'Transfer VerusID'], ['modify', 'Modify VerusID']])(
  'an account change between choosing %s and native dismissal cancels the action',
  async (action, label) => {
    const view = await renderPage();
    await openOptions();
    await choose(view, label);
    mockState = stateFor('bob', 2);
    await closeSheet(optionsSheet(view));
    expect(mockNavigate).not.toHaveBeenCalled();
  },
);

test('an account change between choosing unlink and native dismissal cancels the action', async () => {
  const view = await renderPage();
  await openOptions();
  await choose(view, 'Unlink VerusID');
  mockState = stateFor('bob', 2);
  await closeSheet(optionsSheet(view));
  await choose(view, 'Unlink alice.VRSCTEST@');
  await flush();
  expect(mockUnlinkVerusId).not.toHaveBeenCalled();
});

test('a same-account logout and login invalidates an already-open action sheet', async () => {
  const view = await renderPage();
  await openOptions();
  mockState = stateFor('alice', 3);
  await choose(view, 'Transfer VerusID');
  await closeSheet(optionsSheet(view));
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('the sheet names its identity, exposes separate actions, and disables them while dismissing', () => {
  const onClose = jest.fn();
  const onDismiss = jest.fn();
  const onSelect = jest.fn();
  const props = {selection: {iAddress, chain: 'VRSCTEST', displayName: 'alice.VRSCTEST'}, onClose, onDismiss, onSelect};
  let view;
  act(() => {view = create(<IdentityActionsModal {...props} visible />);});
  const actions = view.root.findAllByType(Pressable);
  expect(actions.map(action => action.props.accessibilityLabel).filter(Boolean)).toEqual([
    'Close identity actions', 'Transfer identity, alice.VRSCTEST@', 'Modify identity, alice.VRSCTEST@',
    'View details, alice.VRSCTEST@', 'Unlink identity, alice.VRSCTEST@',
  ]);
  act(() => actions[1].props.onPress());
  expect(onSelect).toHaveBeenCalledWith('transfer');
  expect(onClose).not.toHaveBeenCalled();
  expect(view.root.findByType('SemiModal').props.onDismiss).toBe(onDismiss);
  expect(actions[0].props.style({pressed: false})[0]).toMatchObject({width: 44, height: 44});
  act(() => view.update(<IdentityActionsModal {...props} visible={false} />));
  view.root.findAllByType(Pressable).forEach(action => expect(action.props.disabled).toBe(true));
  act(() => view.unmount());
});
