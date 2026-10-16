const mockFindCoin = jest.fn();
const mockHeaderHeight = jest.fn();
const mockSafeAreaInsets = jest.fn();
jest.mock('react-native', () => ({
  View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', KeyboardAvoidingView: 'KeyboardAvoidingView',
  RefreshControl: 'RefreshControl', Keyboard: {dismiss: jest.fn()}, Platform: {OS: 'ios'},
  StyleSheet: {create: value => value, hairlineWidth: 1},
  useWindowDimensions: () => ({width: 320, height: 640, fontScale: 2}),
}));
jest.mock('react-native-paper', () => ({Text: 'Text', ActivityIndicator: 'ActivityIndicator'}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => mockSafeAreaInsets()}));
jest.mock('@react-navigation/elements', () => ({useHeaderHeight: () => mockHeaderHeight()}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {findCoinObj: (...args) => mockFindCoin(...args)}}));

const React = require('react');
const {Keyboard, Platform} = require('react-native');
const {Text} = require('react-native-paper');
const {act, create} = require('react-test-renderer');
const {AmountRows, CostReview, DetailRow, RegistrationDetails, RegistrationListItem, RegistrationPage, currencyLabel} =
  require('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/RegistrationComponents');
const rootAddress = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const tokenAddress = `i${'C'.repeat(33)}`;
const ownAddress = `i${'D'.repeat(33)}`;
const textContent = node => typeof node === 'string' ? node : (node.children || []).map(textContent).join('');
const flattenStyle = style => Array.isArray(style) ? Object.assign({}, ...style.map(flattenStyle)) : style;
const openDisclosure = (view, title) => act(() => view.root.findAllByType('Pressable')
  .find(node => node.props.accessibilityLabel === title || node.props.accessibilityLabel?.startsWith(`${title}.`)).props.onPress());
let views;
const mount = (component, options) => {
  let view;
  act(() => { view = create(component, options); });
  views.push(view);
  return view;
};
beforeEach(() => {
  views = [];
  mockFindCoin.mockReset();
  mockHeaderHeight.mockReset().mockReturnValue(96);
  mockSafeAreaInsets.mockReset().mockReturnValue({bottom: 20});
  Keyboard.dismiss.mockClear();
  Platform.OS = 'ios';
});
afterEach(() => act(() => views.forEach(view => view.unmount())));

test('a root currency referral keeps its identity suffix while amount units remain currency names', () => {
  const currencyNames = {[rootAddress]: 'VRSCTEST', [tokenAddress]: 'Champions@'};
  const view = mount(<RegistrationDetails review={{
    displayName: 'alice.Champions@', identityAddress: ownAddress, referralID: rootAddress,
    fundingAddress: rootAddress, signingAddress: 'wallet', fundingName: 'VRSCTEST',
    currencyNames, identityNames: {[rootAddress]: 'VRSCTEST'},
    identity: {parent: tokenAddress, recoveryauthority: ownAddress, revocationauthority: ownAddress, minimumsignatures: 1},
  }} />);
  openDisclosure(view, 'Identity details');
  const referral = view.root.findAllByType(DetailRow).find(node => node.props.label === 'Referral');
  const namespace = view.root.findAllByType(DetailRow).find(node => node.props.label === 'Namespace');
  expect(textContent(referral)).toBe('ReferralVRSCTEST@');
  expect(textContent(namespace)).toBe('NamespaceChampions@');
  expect(textContent(view.root)).toContain('Change returns to VRSCTEST@');
  const amounts = mount(<AmountRows label="Total" amounts={{[rootAddress]: '100000000', [tokenAddress]: '100000000'}} currencyNames={currencyNames} />);
  expect(textContent(amounts.root)).toContain('1 VRSCTEST');
  expect(textContent(amounts.root)).toContain('1 Champions');
  expect(textContent(amounts.root)).not.toContain('@');
});

test('a resolved identity name takes precedence over a bare currency alias in identity details', () => {
  const view = mount(<RegistrationDetails review={{
    displayName: 'alice@', identityAddress: ownAddress, referralID: tokenAddress,
    fundingAddress: 'wallet', signingAddress: 'wallet',
    currencyNames: {[tokenAddress]: 'CHAMP'}, identityNames: {[tokenAddress]: 'Champions.VRSCTEST@'},
    identity: {},
  }} />);
  openDisclosure(view, 'Identity details');
  const referral = view.root.findAllByType(DetailRow).find(node => node.props.label === 'Referral');
  expect(textContent(referral)).toBe('ReferralChampions.VRSCTEST@');
});

test('fee recipients use identity suffixes and their amounts use bare token names', () => {
  const view = mount(<CostReview stage="registration" currencyNames={{[rootAddress]: 'VRSCTEST', [tokenAddress]: 'Champions'}} quote={{
    branch: 'token-payment', systemID: rootAddress, commitmentFee: '10000', nativeFee: '2000000',
    totalRequired: {[rootAddress]: '2000000', [tokenAddress]: '100000000'},
    totalOperationRequired: {[rootAddress]: '2010000', [tokenAddress]: '100000000'},
    issuerPayment: {kind: 'payment', currencyID: tokenAddress, amount: '100000000', recipient: tokenAddress},
  }} />);
  openDisclosure(view, 'Fee breakdown');
  expect(textContent(view.root)).toContain('To Champions@');
  expect(textContent(view.root)).toContain('1 Champions');
  expect(textContent(view.root)).not.toContain('1 Champions@');
});

test('currency directory labels and fallback labels omit identity suffixes', () => {
  mockFindCoin.mockReturnValueOnce({display_ticker: 'VRSCTEST@'});
  expect(currencyLabel(rootAddress)).toBe('VRSCTEST');
  expect(currencyLabel(tokenAddress, {[tokenAddress]: 'Champions@'})).toBe('Champions');
  expect(currencyLabel(tokenAddress)).toBe('Unknown currency (iCCCC…CCCC)');
});

test('saved registration opening and deletion are separate accessible actions', () => {
  const onPress = jest.fn();
  const onDelete = jest.fn();
  const view = mount(<RegistrationListItem job={{displayName: 'alice@', status: 'commitment_prepared'}} onPress={onPress} onDelete={onDelete} />);
  const actions = view.root.findAllByType('Pressable');
  expect(actions).toHaveLength(2);
  expect(actions[0].findAllByType('Pressable')).toHaveLength(1);
  expect(actions[1].props.accessibilityLabel).toBe('Delete saved registration for alice@');
  act(() => actions[1].props.onPress());
  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(onPress).not.toHaveBeenCalled();
});

test('a deletion in progress disables both saved registration actions', () => {
  const view = mount(<RegistrationListItem job={{displayName: 'alice@', status: 'commitment_prepared'}} onPress={jest.fn()} onDelete={jest.fn()} deleting />);
  const actions = view.root.findAllByType('Pressable');
  actions.forEach(action => expect(action.props.disabled).toBe(true));
  expect(actions[1].props.accessibilityState.busy).toBe(true);
  expect(textContent(view.root)).toContain('Deleting…');
});

test('the primary footer stays outside the scrolling content and reserves safe-area space', () => {
  mockSafeAreaInsets.mockReturnValue({bottom: 34});
  mockHeaderHeight.mockReturnValue(125);
  const view = mount(<RegistrationPage footer={<Text testID="primary-action">Continue</Text>}>
    <Text testID="scroll-content">Identity details</Text>
  </RegistrationPage>);
  const keyboardView = view.root.findByType('KeyboardAvoidingView');
  const scroll = view.root.findByType('ScrollView');
  const footer = view.root.findByProps({testID: 'registration-footer'});
  expect(footer.parent).toBe(keyboardView);
  expect(scroll.parent).toBe(keyboardView);
  expect(scroll.findAllByProps({testID: 'primary-action'})).toHaveLength(0);
  expect(footer.findByProps({testID: 'primary-action'})).toBeDefined();
  expect(flattenStyle(scroll.props.style)).toMatchObject({flex: 1});
  expect(flattenStyle(footer.props.style)).toMatchObject({flexShrink: 0, backgroundColor: '#fff', borderTopWidth: 1});
  expect(flattenStyle(footer.children[0].props.style)).toMatchObject({
    width: '100%', maxWidth: 600, paddingHorizontal: 16, paddingBottom: 34,
  });
  expect(flattenStyle(scroll.props.contentContainerStyle).paddingBottom).toBe(16);
  expect(keyboardView.props.behavior).toBe('padding');
  expect(keyboardView.props.keyboardVerticalOffset).toBe(125);
});

test('Android uses local height avoidance with the activity configured to pan for keyboards', () => {
  Platform.OS = 'android';
  mockSafeAreaInsets.mockReturnValue({bottom: 0});
  const view = mount(<RegistrationPage footer={<Text>Continue</Text>} />);
  const keyboardView = view.root.findByType('KeyboardAvoidingView');
  const footer = view.root.findByProps({testID: 'registration-footer'});
  expect(keyboardView.props.behavior).toBe('height');
  expect(keyboardView.props.keyboardVerticalOffset).toBe(96);
  expect(flattenStyle(footer.children[0].props.style).paddingBottom).toBe(16);
});

test('pages without a footer retain scroll padding and pull-to-refresh behavior', () => {
  const onRefresh = jest.fn();
  const view = mount(<RegistrationPage onRefresh={onRefresh} refreshing />);
  const scroll = view.root.findByType('ScrollView');
  expect(view.root.findAllByProps({testID: 'registration-footer'})).toHaveLength(0);
  expect(flattenStyle(scroll.props.contentContainerStyle).paddingBottom).toBe(36);
  expect(scroll.props.refreshControl.props.refreshing).toBe(true);
  act(() => scroll.props.refreshControl.props.onRefresh());
  expect(onRefresh).toHaveBeenLastCalledWith(true);
  act(() => scroll.props.onAccessibilityAction({nativeEvent: {actionName: 'refresh'}}));
  expect(onRefresh).toHaveBeenCalledTimes(2);
});

test('errors still dismiss the keyboard and reveal the alert above the scrolling content', () => {
  const scrollTo = jest.fn();
  const view = mount(<RegistrationPage error={{message: 'Review this payment again.'}} footer={<Text>Continue</Text>} />, {
    createNodeMock: element => element.type === 'ScrollView' ? {scrollTo} : null,
  });
  expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
  expect(scrollTo).toHaveBeenCalledWith({y: 0, animated: true});
  const scroll = view.root.findByType('ScrollView');
  expect(textContent(scroll.findByProps({accessibilityRole: 'alert'}))).toBe('Review this payment again.');
});
