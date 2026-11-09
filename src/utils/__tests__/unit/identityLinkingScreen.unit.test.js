const mockApi = {captureIdentityLinkContext: jest.fn(), discoverLinkableIdentities: jest.fn(), linkSelectedIdentities: jest.fn(), retryIdentityLinkRefresh: jest.fn()};
let mockState;
jest.mock('../../identityLinking/identityLinking', () => mockApi);
jest.mock('react-redux', () => ({useSelector: selector => selector(mockState)}));
jest.mock('../../../store', () => ({__esModule: true, default: {getState: () => mockState}}));
jest.mock('@react-navigation/elements', () => ({useHeaderHeight: () => 96}));
jest.mock('react-native', () => ({
  View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', KeyboardAvoidingView: 'KeyboardAvoidingView',
  RefreshControl: 'RefreshControl', Platform: {OS: 'ios'}, Keyboard: {dismiss: jest.fn()},
  StyleSheet: {create: value => value, hairlineWidth: 1},
  useWindowDimensions: () => ({width: 320, height: 640, fontScale: 2}),
  FlatList: require('react').forwardRef((props, ref) => require('react').createElement('FlatList', {...props, ref},
    props.ListHeaderComponent,
    props.data.length ? props.data.map(item => require('react').createElement(require('react').Fragment, {key: item.identityAddress}, props.renderItem({item}))) : props.ListEmptyComponent)),
}));
jest.mock('react-native-paper', () => ({Text: 'Text', TextInput: 'TextInput', ActivityIndicator: 'ActivityIndicator'}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({bottom: 20})}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {findCoinObj: () => undefined}}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const LinkIdentities = require('../../../containers/Services/ServiceComponents/VerusIdService/IdentityLinking/LinkIdentities').default;
const {captureSessionScope} = require('../../../actions/actions/updates/sessionRequests');
const rows = [
  {identityAddress: 'iAlice', displayName: 'alice@', canControl: true, linked: false},
  {identityAddress: 'iBob', displayName: 'bob@', canControl: true, minimumSignatures: 2, linked: false},
  {identityAddress: 'iLinked', displayName: 'linked@', canControl: true, linked: true},
];
const text = node => typeof node === 'string' ? node : (node.children || []).map(text).join('');
const button = (view, label) => view.root.findAllByType('Pressable').find(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label);
const checkbox = (view, name) => view.root.findAllByType('Pressable').find(node => node.props.accessibilityRole === 'checkbox' && node.props.accessibilityLabel.startsWith(name));
const press = async node => {expect(node).toBeDefined(); await act(async () => node.props.onPress());};
const deferred = () => {
  let resolve;
  const promise = new Promise(yes => {resolve = yes;});
  return {promise, resolve};
};
const navigation = () => ({goBack: jest.fn(), setOptions: jest.fn(), addListener: jest.fn(() => jest.fn())});
let views;
const mount = async (props = {}) => {
  let view;
  await act(async () => {view = create(<LinkIdentities navigation={props.navigation || navigation()} route={{params: {chain: 'VRSC'}}} {...props} />);});
  views.push(view);
  return view;
};
beforeEach(() => {
  jest.clearAllMocks();
  views = [];
  mockState = {
    authentication: {activeAccount: {accountHash: 'account', keys: {VRSC: {vrpc: {addresses: ['Rwallet']}}, PBaaS: {vrpc: {addresses: ['Rother']}}}}, sessionEpoch: 1},
    coins: {activeCoinsForUser: [
      {id: 'VRSC', system_id: 'system', currency_id: 'system', display_ticker: 'VRSC'},
      {id: 'PBaaS', system_id: 'pbaas', currency_id: 'pbaas', display_ticker: 'PBaaS'},
    ]},
  };
  mockApi.captureIdentityLinkContext.mockReset().mockImplementation(chain => ({
    chain: chain || 'VRSC', networkName: chain || 'VRSC', walletAddresses: ['Rwallet'],
    sessionScope: captureSessionScope(mockState),
  }));
  mockApi.discoverLinkableIdentities.mockReset().mockResolvedValue(rows);
  mockApi.linkSelectedIdentities.mockReset().mockImplementation(async ({identities}) => ({linked: identities, failed: [], refreshError: null}));
  mockApi.retryIdentityLinkRefresh.mockReset().mockResolvedValue(undefined);
});
afterEach(() => act(() => views.forEach(view => view.unmount())));

test('displays spendable identities and already-linked rows with a fixed action', async () => {
  const view = await mount();
  expect(text(view.root)).toContain('Choose from identities this wallet can spend from.');
  expect(checkbox(view, 'alice@')).toBeDefined();
  expect(checkbox(view, 'bob@')).toBeDefined();
  expect(checkbox(view, 'linked@').props.accessibilityState).toEqual({checked: true, disabled: true});
  expect(button(view, 'Link identities').props.disabled).toBe(true);
  expect(view.root.findByProps({testID: 'identity-link-footer'}).findAllByType('Pressable')).toContain(button(view, 'Link identities'));
  expect(view.root.findByType('FlatList').findAllByType('Pressable')).not.toContain(button(view, 'Link identities'));
  expect(mockApi.linkSelectedIdentities).not.toHaveBeenCalled();
});

test('links only checked identities together and shows saved links before returning', async () => {
  const nav = navigation();
  const view = await mount({navigation: nav});
  await press(checkbox(view, 'alice@'));
  await press(checkbox(view, 'bob@'));
  expect(text(view.root)).toContain('2 selected');
  await press(button(view, 'Link identities'));
  expect(mockApi.linkSelectedIdentities).toHaveBeenCalledTimes(1);
  expect(mockApi.linkSelectedIdentities.mock.calls[0][0].identities).toEqual([rows[0], rows[1]]);
  expect(mockApi.linkSelectedIdentities.mock.calls[0][0].identities[0]).toBe(rows[0]);
  expect(text(view.root)).toContain('2 identities linked to your wallet.');
  expect(checkbox(view, 'alice@').props.disabled).toBe(true);
  await press(button(view, 'Done'));
  expect(nav.goBack).toHaveBeenCalledTimes(1);
});

test('searching does not discard checked identities outside the filtered list', async () => {
  const view = await mount();
  await press(checkbox(view, 'alice@'));
  await act(async () => view.root.findByType('TextInput').props.onChangeText('bob'));
  expect(checkbox(view, 'alice@')).toBeUndefined();
  await press(checkbox(view, 'bob@'));
  await press(button(view, 'Link identities'));
  expect(mockApi.linkSelectedIdentities.mock.calls[0][0].identities).toEqual([rows[0], rows[1]]);
});

test('partial success keeps failed selections available for retry without repeating saved identities', async () => {
  mockApi.linkSelectedIdentities.mockResolvedValueOnce({linked: [rows[0]], failed: [{identity: rows[1], error: new Error('Storage unavailable')}], refreshError: null});
  const view = await mount();
  await press(checkbox(view, 'alice@'));
  await press(checkbox(view, 'bob@'));
  await press(button(view, 'Link identities'));
  expect(text(view.root)).toContain('bob@: Storage unavailable');
  expect(checkbox(view, 'alice@').props.disabled).toBe(true);
  expect(checkbox(view, 'bob@').props.accessibilityState.checked).toBe(true);
  await press(button(view, 'Link identities'));
  expect(mockApi.linkSelectedIdentities.mock.calls[1][0].identities).toEqual([rows[1]]);
});

test('a wallet refresh failure is reported as saved links, not a failed save', async () => {
  mockApi.linkSelectedIdentities.mockResolvedValueOnce({linked: [rows[0]], failed: [], refreshError: new Error('Refresh unavailable')});
  const view = await mount();
  await press(checkbox(view, 'alice@'));
  await press(button(view, 'Link identities'));
  expect(text(view.root)).toContain('Your identities were saved');
  expect(checkbox(view, 'alice@').props.disabled).toBe(true);
  expect(button(view, 'Done')).toBeDefined();
  mockApi.discoverLinkableIdentities.mockResolvedValue(rows.map(row => row.identityAddress === 'iAlice' ? {...row, linked: true} : row));
  await press(button(view, 'Refresh wallet'));
  expect(mockApi.retryIdentityLinkRefresh).toHaveBeenCalledTimes(1);
  expect(mockApi.linkSelectedIdentities).toHaveBeenCalledTimes(1);
  expect(text(view.root)).not.toContain('could not refresh');
});

test('rejects double taps and prevents leaving while a save is in progress', async () => {
  const pending = deferred();
  mockApi.linkSelectedIdentities.mockReturnValue(pending.promise);
  const nav = navigation();
  const view = await mount({navigation: nav});
  await press(checkbox(view, 'alice@'));
  const submit = button(view, 'Link identities').props.onPress;
  act(() => {submit(); submit();});
  expect(mockApi.linkSelectedIdentities).toHaveBeenCalledTimes(1);
  const event = {preventDefault: jest.fn()};
  nav.addListener.mock.calls.find(([type]) => type === 'beforeRemove')[1](event);
  expect(event.preventDefault).toHaveBeenCalledTimes(1);
  expect(nav.setOptions).toHaveBeenLastCalledWith({gestureEnabled: false});
  await act(async () => pending.resolve({linked: [rows[0]], failed: [], refreshError: null}));
});

test('a failed selection retry retains an earlier wallet-refresh failure until refresh succeeds', async () => {
  const failure = {identity: rows[1], error: new Error('Storage unavailable')};
  mockApi.linkSelectedIdentities
    .mockResolvedValueOnce({linked: [rows[0]], failed: [failure], refreshError: new Error('Refresh unavailable')})
    .mockResolvedValueOnce({linked: [], failed: [failure], refreshError: null});
  const view = await mount();
  await press(checkbox(view, 'alice@'));
  await press(checkbox(view, 'bob@'));
  await press(button(view, 'Link identities'));
  await press(button(view, 'Link identities'));
  expect(button(view, 'Refresh wallet')).toBeDefined();
  await press(button(view, 'Refresh wallet'));
  expect(mockApi.retryIdentityLinkRefresh).toHaveBeenCalledTimes(1);
});

test('discovery errors have a retry and empty results cannot be submitted', async () => {
  mockApi.discoverLinkableIdentities.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValue([]);
  const view = await mount();
  expect(text(view.root)).toContain('Network unavailable');
  await press(button(view, 'Try again'));
  expect(text(view.root)).toContain('No identities found');
  expect(text(view.root)).toContain('No identities this wallet can spend from were found on this network.');
  expect(button(view, 'Link identities').props.disabled).toBe(true);
});

test('switching networks ignores late results from the previous network', async () => {
  const pending = deferred();
  mockApi.discoverLinkableIdentities.mockReturnValueOnce(pending.promise).mockResolvedValue([]);
  const view = await mount();
  await press(button(view, 'Network: VRSC'));
  const network = view.root.findAllByType('Pressable').find(node => node.props.accessibilityRole === 'radio' && node.props.accessibilityLabel === 'PBaaS');
  await press(network);
  await act(async () => pending.resolve(rows));
  expect(checkbox(view, 'alice@')).toBeUndefined();
  expect(mockApi.captureIdentityLinkContext).toHaveBeenLastCalledWith('PBaaS');
});

test('switching networks clears the previous network’s successful linking message', async () => {
  const view = await mount();
  await press(checkbox(view, 'alice@'));
  await press(button(view, 'Link identities'));
  expect(button(view, 'Done')).toBeDefined();
  mockApi.discoverLinkableIdentities.mockResolvedValue([]);
  await press(button(view, 'Network: VRSC'));
  await press(view.root.findAllByType('Pressable').find(node => node.props.accessibilityRole === 'radio' && node.props.accessibilityLabel === 'PBaaS'));
  expect(text(view.root)).not.toContain('identity linked to your wallet');
  expect(button(view, 'Done')).toBeUndefined();
  expect(button(view, 'Link identities').props.disabled).toBe(true);
});

test('switching accounts discards selections and late discovery from the previous account', async () => {
  const pending = deferred();
  mockApi.discoverLinkableIdentities.mockReturnValueOnce(pending.promise).mockResolvedValue([]);
  const nav = navigation();
  const view = await mount({navigation: nav});
  mockState.authentication = {...mockState.authentication, activeAccount: {...mockState.authentication.activeAccount, accountHash: 'other'}, sessionEpoch: 2};
  await act(async () => view.update(<LinkIdentities navigation={nav} route={{params: {chain: 'VRSC'}}} />));
  await act(async () => pending.resolve(rows));
  expect(checkbox(view, 'alice@')).toBeUndefined();
  expect(button(view, 'Link identities').props.disabled).toBe(true);
});

test.each(['keys', 'network'])('changing wallet %s during a save starts fresh discovery and ignores the old result', async change => {
  const pending = deferred();
  mockApi.linkSelectedIdentities.mockReturnValueOnce(pending.promise);
  const nav = navigation();
  const view = await mount({navigation: nav});
  await press(checkbox(view, 'alice@'));
  act(() => {button(view, 'Link identities').props.onPress();});
  mockApi.discoverLinkableIdentities.mockResolvedValue([]);
  if (change === 'keys') mockState.authentication.activeAccount.keys.VRSC.vrpc.addresses = ['Rchanged'];
  else mockState.authentication.activeAccount.testnetOverrides = {VRSC: 'VRSCTEST'};
  await act(async () => view.update(<LinkIdentities navigation={nav} route={{params: {chain: 'VRSC'}}} />));
  await act(async () => pending.resolve({linked: [rows[0]], failed: [], refreshError: null}));
  expect(mockApi.discoverLinkableIdentities).toHaveBeenCalledTimes(2);
  expect(checkbox(view, 'alice@')).toBeUndefined();
  expect(text(view.root)).not.toContain('identity linked to your wallet');
  expect(button(view, 'Link identities').props.disabled).toBe(true);
});
