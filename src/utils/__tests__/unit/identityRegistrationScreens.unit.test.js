const mockApi = {
  createRegistrationContext: jest.fn(() => ({sessionScope: {accountHash: 'account', sessionEpoch: 1}})),
  resolveRegistration: jest.fn(), prepareCommitment: jest.fn(), getRegistrationReview: jest.fn(),
  approveCommitment: jest.fn(), prepareRegistration: jest.fn(), approveRegistration: jest.fn(),
  retryBroadcast: jest.fn(), reconcileRegistration: jest.fn(), refreshRegistrationReview: jest.fn(),
  findExistingRegistration: jest.fn(), linkRegisteredIdentity: jest.fn(), deleteRegistration: jest.fn(),
};
let mockState;
const mockAlert = jest.fn();
const mockScrollTo = jest.fn();
jest.mock('../../identityRegistration', () => mockApi);
jest.mock('react-redux', () => ({useSelector: selector => selector(mockState)}));
jest.mock('@react-navigation/native', () => ({useFocusEffect: callback => require('react').useEffect(callback, [callback])}));
jest.mock('@react-navigation/elements', () => ({useHeaderHeight: () => 96}));
jest.mock('react-native', () => ({
  AppState: {currentState: 'active', addEventListener: () => ({remove: jest.fn()})},
  View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', KeyboardAvoidingView: 'KeyboardAvoidingView',
  RefreshControl: 'RefreshControl', Alert: {alert: mockAlert}, Keyboard: {dismiss: jest.fn()},
  Platform: {OS: 'ios'}, StyleSheet: {create: value => value, hairlineWidth: 1},
  useWindowDimensions: () => ({width: 320, height: 640, fontScale: 2}),
}));
jest.mock('react-native-paper', () => ({Text: 'Text', TextInput: 'TextInput', ActivityIndicator: 'ActivityIndicator'}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({bottom: 20})}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {findCoinObj: () => undefined}}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {
  IdentityRegistrationStart, IdentityRegistrationCreate, IdentityCommitmentReview,
  IdentityRegistrationReview, IdentityRegistrationProgress,
} = require('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/RegistrationScreens');
const {CostReview, AmountRows} = require('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/RegistrationComponents');
const {preferredRegistrationFundingSource, registrationFundingSources} = require('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/fundingSources');
const quote = {totalOperationRequired: {chain: '100010000'}, totalRequired: {chain: '100000000'}, commitmentFee: '10000', systemID: 'chain'};
const review = {
  jobId: 'job', revision: 4, approvalToken: 'review-token', status: 'commitment_prepared', displayName: 'alice@',
  quote, systemId: 'chain', currencyNames: {chain: 'VRSC'}, identityAddress: 'identity',
  identity: {primaryaddresses: ['wallet']}, fundingName: 'Wallet address',
  fundingAddress: 'wallet', signingAddress: 'wallet', linked: false,
};
const setSavedReview = value => {
  mockApi.getRegistrationReview.mockResolvedValue(value);
  mockApi.reconcileRegistration.mockResolvedValue(value);
};
const textContent = node => typeof node === 'string' ? node : (node.children || []).map(textContent).join('');
const button = (view, label) => view.root.findAllByType('Pressable').find(node =>
  node.props.accessibilityRole === 'button' && node.findAllByType('Text').some(text => textContent(text) === label));
const checkbox = view => view.root.findAllByType('Pressable').find(node => node.props.accessibilityRole === 'checkbox');
const footerAction = (view, label) => {
  const matches = node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label;
  const buttons = view.root.findAllByType('Pressable').filter(matches);
  expect(buttons).toHaveLength(1);
  expect(view.root.findByType('ScrollView').findAllByType('Pressable').filter(matches)).toHaveLength(0);
  const footerButtons = view.root.findByProps({testID: 'registration-footer'}).findAllByType('Pressable').filter(matches);
  expect(footerButtons).toEqual(buttons);
  return buttons[0];
};
const radio = (view, label) => view.root.findAllByType('Pressable').find(node =>
  node.props.accessibilityRole === 'radio' && node.props.accessibilityLabel === label);
const press = async node => {await act(async () => node.props.onPress());};
const pullRefresh = async view => {
  const control = view.root.findByType('ScrollView').props.refreshControl;
  expect(control.type).toBe('RefreshControl');
  await act(async () => control.props.onRefresh());
};
const enterName = async (view, name = 'alice') => {
  await act(async () => view.root.findAllByType('TextInput').find(node => node.props.label === 'Identity name').props.onChangeText(name));
};
let views;
const mount = async (Component, props = {}) => {
  let view;
  await act(async () => {
    view = create(<Component navigation={props.navigation || {navigate: jest.fn(), replace: jest.fn()}} route={{params: {jobId: 'job'}}} {...props} />, {
      createNodeMock: node => node.type === 'ScrollView' ? {scrollTo: mockScrollTo} : null,
    });
  });
  views.push(view);
  return view;
};
beforeEach(() => {
  jest.clearAllMocks();
  mockScrollTo.mockReset();
  views = [];
  mockState = {
    authentication: {activeAccount: {keys: {VRSC: {vrpc: {addresses: ['wallet']}}}}},
    coins: {activeCoinsForUser: [{id: 'VRSC', system_id: 'chain', currency_id: 'chain', display_ticker: 'VRSC'}]},
    channelStore_verusid: {registrationJobs: {}},
  };
  setSavedReview({...review});
  mockApi.reconcileRegistration.mockResolvedValue({...review});
  mockApi.approveCommitment.mockResolvedValue({...review, status: 'commitment_broadcast'});
  mockApi.approveRegistration.mockResolvedValue({...review, status: 'registration_broadcast'});
  mockApi.prepareRegistration.mockResolvedValue({...review, status: 'registration_prepared'});
  mockApi.refreshRegistrationReview.mockResolvedValue({...review});
  mockApi.resolveRegistration.mockResolvedValue({quote, currencyNames: {chain: 'VRSC'}});
  mockApi.prepareCommitment.mockResolvedValue({...review});
  mockApi.findExistingRegistration.mockResolvedValue(null);
  mockApi.deleteRegistration.mockResolvedValue(undefined);
  mockApi.linkRegisteredIdentity.mockResolvedValue({...review, status: 'complete', linked: true});
});
afterEach(() => {
  act(() => views.forEach(view => view.unmount()));
  jest.useRealTimers();
});

it.each([
  ['overview', IdentityRegistrationStart, 'Create a VerusID'],
  ['create form', IdentityRegistrationCreate, 'Review costs'],
])('keeps the %s primary action available outside the scrolling content', async (_, Component, label) => {
  const view = await mount(Component);
  const action = footerAction(view, label);
  if (Component === IdentityRegistrationCreate) {
    expect(action.props.disabled).toBe(true);
    await enterName(view);
    expect(footerAction(view, label).props.disabled).toBe(false);
  }
});

it.each([
  ['commitment', IdentityCommitmentReview, 'commitment_prepared', 'Pay & commit name'],
  ['registration', IdentityRegistrationReview, 'registration_prepared', 'Pay & register identity'],
])('keeps the %s approval checkbox together with its single fixed payment action', async (_, Component, status, label) => {
  setSavedReview({...review, status});
  const view = await mount(Component);
  expect(footerAction(view, label).props.disabled).toBe(true);
  const footer = view.root.findByProps({testID: 'registration-footer'});
  const checks = footer.findAllByType('Pressable').filter(node => node.props.accessibilityRole === 'checkbox');
  expect(checks).toHaveLength(1);
  expect(checks[0]).toBe(checkbox(view));
  expect(view.root.findByType('ScrollView').findAllByType('Pressable')
    .filter(node => node.props.accessibilityRole === 'checkbox')).toHaveLength(0);
  expect(view.root.findByType('ScrollView').findAllByType(CostReview)).toHaveLength(1);
  await press(checks[0]);
  expect(footerAction(view, label).props.disabled).toBe(false);
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(mockApi.approveRegistration).not.toHaveBeenCalled();
});

it.each([
  ['commitment', IdentityCommitmentReview, 'commitment_prepared', 'Pay & commit name'],
  ['registration', IdentityRegistrationReview, 'registration_prepared', 'Pay & register identity'],
])('retains a named disabled %s payment action while its review is loading', async (_, Component, status, label) => {
  let finishLoading;
  mockApi.getRegistrationReview.mockReturnValueOnce(new Promise(resolve => {finishLoading = resolve;}));
  const view = await mount(Component);
  const action = footerAction(view, label);
  expect(action.props.disabled).toBe(true);
  expect(action.props.accessibilityState.busy).toBe(false);
  expect(action.findAllByType('ActivityIndicator')).toHaveLength(0);
  await act(async () => finishLoading({...review, status}));
  expect(footerAction(view, label).props.disabled).toBe(true);
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(mockApi.approveRegistration).not.toHaveBeenCalled();
});

it.each([
  ['commitment_prepared', 'Review commitment'],
  ['commitment_expired', 'Review replacement'],
  ['commitment_confirmed', 'Continue registration'],
  ['registration_prepared', 'Continue registration'],
  ['registration_expired', 'Continue registration'],
  ['registered', 'Link to wallet'],
  ['complete', 'Done'],
  ['commitment_broadcast', 'Done for now'],
  ['registration_broadcast', 'Done for now'],
  ['commitment_signed', 'Retry sending'],
  ['registration_signed', 'Retry sending'],
  ['needs_review', 'Check status'],
])('keeps the %s progress action in the fixed footer without a duplicate scrolling action', async (status, label) => {
  setSavedReview({...review, status});
  const view = await mount(IdentityRegistrationProgress);
  expect(footerAction(view, label).props.disabled).toBe(false);
});

it('keeps a failed initial progress check retryable through one footer action', async () => {
  mockApi.reconcileRegistration.mockRejectedValueOnce(new Error('Connection unavailable'));
  const view = await mount(IdentityRegistrationProgress);
  await press(footerAction(view, 'Check status'));
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(2);
  footerAction(view, 'Review commitment');
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
});

it('requires explicit commitment cost acceptance and does not also approve registration', async () => {
  const navigation = {navigate: jest.fn(), replace: jest.fn()};
  const view = await mount(IdentityCommitmentReview, {navigation});
  expect(button(view, 'Pay & commit name').props.disabled).toBe(true);
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(textContent(view.root)).toContain('Estimated total');
  expect(textContent(view.root)).toContain('1.0001 VRSC');
  await press(checkbox(view));
  expect(button(view, 'Pay & commit name').props.disabled).toBe(false);
  await press(button(view, 'Pay & commit name'));
  expect(mockApi.approveCommitment).toHaveBeenCalledTimes(1);
  expect(mockApi.approveCommitment).toHaveBeenCalledWith('job', 'review-token', expect.any(Object));
  expect(mockApi.approveRegistration).not.toHaveBeenCalled();
  expect(navigation.replace).toHaveBeenCalledWith('IdentityRegistrationProgress', {jobId: 'job'});
});

it('pulling to refresh a price clears the previous acceptance and displays the new total', async () => {
  const nextQuote = {...quote, totalRequired: {chain: '200000000'}, totalOperationRequired: {chain: '200010000'}};
  mockApi.refreshRegistrationReview.mockResolvedValue({...review, quote: nextQuote, approvalToken: 'new-price'});
  const view = await mount(IdentityCommitmentReview);
  await press(checkbox(view));
  expect(button(view, 'Review options')).toBeUndefined();
  await pullRefresh(view);
  expect(button(view, 'Pay & commit name').props.disabled).toBe(true);
  expect(checkbox(view).props.accessibilityState.checked).toBe(false);
  expect(textContent(view.root)).toContain('2.0001 VRSC');
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  await press(checkbox(view));
  await press(button(view, 'Pay & commit name'));
  expect(mockApi.approveCommitment).toHaveBeenCalledWith('job', 'new-price', expect.any(Object));
});

it('does not animate the payment button while only refreshing its costs', async () => {
  const view = await mount(IdentityCommitmentReview);
  await press(checkbox(view));
  let finishRefresh;
  mockApi.refreshRegistrationReview.mockReturnValueOnce(new Promise(resolve => {finishRefresh = resolve;}));
  const control = view.root.findByType('ScrollView').props.refreshControl;
  await act(async () => { control.props.onRefresh(); });
  const payment = button(view, 'Pay & commit name');
  expect(payment.props.disabled).toBe(true);
  expect(payment.props.accessibilityState.busy).toBe(false);
  expect(payment.findAllByType('ActivityIndicator')).toHaveLength(0);
  expect(view.root.findByType('ScrollView').props.refreshControl.props.refreshing).toBe(true);
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  await act(async () => finishRefresh({...review}));
  expect(checkbox(view).props.accessibilityState.checked).toBe(false);
});

it.each([
  [IdentityCommitmentReview, 'commitment_prepared', 'Pay & commit name', 'approveCommitment'],
  [IdentityRegistrationReview, 'registration_prepared', 'Pay & register identity', 'approveRegistration'],
])('prevents double taps from signing either payment twice', async (Component, status, label, method) => {
  let complete;
  setSavedReview({...review, status});
  mockApi[method].mockReturnValue(new Promise(resolve => {complete = resolve;}));
  const view = await mount(Component);
  await press(checkbox(view));
  const onPress = button(view, label).props.onPress;
  act(() => {onPress(); onPress();});
  expect(mockApi[method]).toHaveBeenCalledTimes(1);
  await act(async () => complete({...review, status: status.replace('prepared', 'broadcast')}));
});

it('continuing after confirmation prepares a separate registration review without paying', async () => {
  setSavedReview({...review, status: 'commitment_confirmed', commitmentTxid: 'txid'});
  const navigation = {navigate: jest.fn(), replace: jest.fn()};
  const view = await mount(IdentityRegistrationProgress, {navigation});
  await press(button(view, 'Continue registration'));
  expect(mockApi.prepareRegistration).toHaveBeenCalledWith({jobId: 'job'}, expect.any(Object));
  expect(mockApi.approveRegistration).not.toHaveBeenCalled();
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(navigation.navigate).toHaveBeenCalledWith('IdentityRegistrationReview', {jobId: 'job'});
});

it('does not offer to register an unconfirmed name commitment', async () => {
  setSavedReview({...review, status: 'commitment_broadcast', commitmentTxid: 'txid'});
  const view = await mount(IdentityRegistrationProgress);
  expect(button(view, 'Continue registration')).toBeUndefined();
  expect(textContent(view.root)).toContain('Confirming commitment');
  expect(button(view, 'Done for now')).toBeDefined();
});

it('keeps passive status checks out of action loading and stops polling when ready', async () => {
  jest.useFakeTimers();
  setSavedReview({...review, status: 'commitment_broadcast'});
  const view = await mount(IdentityRegistrationProgress);
  expect(mockApi.getRegistrationReview).not.toHaveBeenCalled();
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(1);
  let finishPoll;
  mockApi.reconcileRegistration.mockReturnValueOnce(new Promise(resolve => {finishPoll = resolve;}));
  await act(async () => { jest.advanceTimersByTime(20000); });
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(2);
  expect(button(view, 'Done for now').props.disabled).toBe(false);
  expect(button(view, 'Check status').props.disabled).not.toBe(true);
  expect(view.root.findAllByType('ActivityIndicator')).toHaveLength(0);
  expect(mockApi.reconcileRegistration.mock.calls[1][1]).toMatchObject({registrationBackground: true});
  await act(async () => finishPoll({...review, status: 'commitment_confirmed'}));
  expect(button(view, 'Continue registration').props.disabled).toBe(false);
  await act(async () => { jest.advanceTimersByTime(60000); });
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(2);
  expect(view.root.findAllByType('ActivityIndicator')).toHaveLength(0);
});

it('aborts a passive check before a foreground action and ignores its stale result', async () => {
  jest.useFakeTimers();
  setSavedReview({...review, status: 'commitment_broadcast'});
  const view = await mount(IdentityRegistrationProgress);
  let finishPoll;
  mockApi.reconcileRegistration
    .mockReturnValueOnce(new Promise(resolve => {finishPoll = resolve;}))
    .mockResolvedValueOnce({...review, status: 'commitment_confirmed'});
  await act(async () => { jest.advanceTimersByTime(20000); });
  const passiveContext = mockApi.reconcileRegistration.mock.calls[1][1];
  await act(async () => { button(view, 'Check status').props.onPress(); });
  expect(passiveContext.signal.aborted).toBe(true);
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(2);
  await act(async () => finishPoll({...review, status: 'registered'}));
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(3);
  expect(mockApi.reconcileRegistration.mock.calls[2][1].registrationBackground).toBeUndefined();
  expect(button(view, 'Continue registration')).toBeDefined();
  expect(button(view, 'Link to wallet')).toBeUndefined();
  expect(view.root.findAllByProps({accessibilityRole: 'alert'})).toHaveLength(0);
});

it('aborts passive work when progress unmounts', async () => {
  jest.useFakeTimers();
  setSavedReview({...review, status: 'commitment_broadcast'});
  const view = await mount(IdentityRegistrationProgress);
  let finishPoll;
  mockApi.reconcileRegistration.mockReturnValueOnce(new Promise(resolve => {finishPoll = resolve;}));
  await act(async () => { jest.advanceTimersByTime(20000); });
  const passiveContext = mockApi.reconcileRegistration.mock.calls[1][1];
  act(() => view.unmount());
  expect(passiveContext.signal.aborted).toBe(true);
  await act(async () => finishPoll({...review, status: 'registered'}));
  await act(async () => { jest.advanceTimersByTime(60000); });
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(2);
});

it('requires a fresh acceptance for the registration payment and distinguishes the already-paid commitment', async () => {
  setSavedReview({...review, status: 'registration_prepared'});
  const view = await mount(IdentityRegistrationReview);
  expect(button(view, 'Pay & register identity').props.disabled).toBe(true);
  expect(view.root.findByType(CostReview).props.stage).toBe('registration');
  expect(textContent(view.root)).toContain('Commitment already paid');
  expect(checkbox(view).props.accessibilityState.checked).toBe(false);
  await press(checkbox(view));
  await press(button(view, 'Pay & register identity'));
  expect(mockApi.approveRegistration).toHaveBeenCalledWith('job', 'review-token', expect.any(Object));
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
});

it('saves a payment review for later without approving either payment', async () => {
  const navigation = {navigate: jest.fn(), replace: jest.fn()};
  const view = await mount(IdentityCommitmentReview, {navigation});
  await press(button(view, 'Save for later'));
  expect(navigation.navigate).toHaveBeenCalledWith('IdentityRegistrationStart');
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(mockApi.approveRegistration).not.toHaveBeenCalled();
});

it('the form quotes both stages and navigates using only a saved job ID', async () => {
  const navigation = {navigate: jest.fn(), replace: jest.fn()};
  const view = await mount(IdentityRegistrationCreate, {navigation});
  await enterName(view);
  await press(button(view, 'Review costs'));
  expect(mockApi.prepareCommitment).toHaveBeenCalledWith({
    request: expect.objectContaining({name: 'alice', systemId: 'chain', fundingAddress: 'wallet', signingAddress: 'wallet', rootSystemName: 'VRSC'}),
  }, expect.any(Object));
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(navigation.navigate).toHaveBeenCalledWith('IdentityCommitmentReview', {jobId: 'job'});
  expect(view.root.findAllByType(CostReview)).toHaveLength(0);
});

it('does not flash costs while preparation is pending and ignores a second review tap', async () => {
  let finishPreparation;
  mockApi.prepareCommitment.mockReturnValue(new Promise(resolve => {finishPreparation = resolve;}));
  const navigation = {navigate: jest.fn(), replace: jest.fn()};
  const view = await mount(IdentityRegistrationCreate, {navigation});
  await enterName(view);
  const reviewPress = button(view, 'Review costs').props.onPress;
  // Let name resolution finish while holding the transaction preparation open.
  // The old flow inserted the quote into this form at exactly this point.
  await act(async () => {reviewPress();});
  expect(mockApi.resolveRegistration).not.toHaveBeenCalled();
  expect(mockApi.prepareCommitment).toHaveBeenCalledTimes(1);
  expect(view.root.findAllByType(CostReview)).toHaveLength(0);
  expect(textContent(view.root)).not.toContain('PAY NOW');
  expect(navigation.navigate).not.toHaveBeenCalled();
  const busyButton = view.root.findAllByType('Pressable').find(node => node.props.accessibilityLabel === 'Review costs');
  expect(busyButton.props.disabled).toBe(true);
  expect(busyButton.props.accessibilityState.busy).toBe(true);
  await act(async () => {reviewPress();});
  expect(mockApi.prepareCommitment).toHaveBeenCalledTimes(1);
  await act(async () => finishPreparation({...review}));
  expect(view.root.findAllByType(CostReview)).toHaveLength(0);
  expect(navigation.navigate).toHaveBeenCalledTimes(1);
  expect(navigation.navigate).toHaveBeenCalledWith('IdentityCommitmentReview', {jobId: 'job'});
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
});

it.each([
  ['commitment_prepared', 'IdentityCommitmentReview'],
  ['registration_prepared', 'IdentityRegistrationReview'],
  ['commitment_broadcast', 'IdentityRegistrationProgress'],
  ['registered', 'IdentityRegistrationProgress'],
])('resumes an existing %s registration before quoting or preparing another payment', async (status, screen) => {
  mockApi.prepareCommitment.mockResolvedValue({...review, jobId: 'existing', status});
  const navigation = {navigate: jest.fn(), replace: jest.fn()};
  const view = await mount(IdentityRegistrationCreate, {navigation});
  await enterName(view);
  await press(button(view, 'Review costs'));
  expect(mockApi.prepareCommitment).toHaveBeenCalledWith({request: expect.objectContaining({
    name: 'alice', systemId: 'chain', rootSystemName: 'VRSC',
  })}, expect.any(Object));
  expect(navigation.navigate).toHaveBeenCalledWith(screen, {jobId: 'existing'});
  expect(mockApi.resolveRegistration).not.toHaveBeenCalled();
  expect(mockApi.prepareCommitment).toHaveBeenCalledTimes(1);
  expect(mockApi.findExistingRegistration).not.toHaveBeenCalled();
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(view.root.findAllByType(CostReview)).toHaveLength(0);
});

it('offers to link a confirmed identity and links only after explicit confirmation', async () => {
  const registered = {...review, status: 'registered', linked: false, commitmentHeight: 10, registrationTxid: 'registration-txid'};
  setSavedReview(registered);
  const view = await mount(IdentityRegistrationProgress);
  expect(mockApi.linkRegisteredIdentity).not.toHaveBeenCalled();
  expect(textContent(view.root)).toContain('Ready to link');
  expect(textContent(view.root)).toContain('Registration paid');
  expect(button(view, 'Pay & register identity')).toBeUndefined();
  await press(button(view, 'Link to wallet'));
  expect(mockApi.linkRegisteredIdentity).not.toHaveBeenCalled();
  const actions = mockAlert.mock.calls[0][2];
  expect(actions.find(action => action.text === 'Not now').style).toBe('cancel');
  await act(async () => actions.find(action => action.text === 'Link identity').onPress());
  expect(mockApi.linkRegisteredIdentity).toHaveBeenCalledTimes(1);
  expect(mockApi.linkRegisteredIdentity).toHaveBeenCalledWith('job', expect.any(Object));
  expect(mockApi.approveRegistration).not.toHaveBeenCalled();
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(button(view, 'Link to wallet')).toBeUndefined();
  expect(textContent(view.root)).toContain('linked to this wallet');
});

it('stops passive polling after registration is ready to link and accepts confirmation once', async () => {
  jest.useFakeTimers();
  setSavedReview({...review, status: 'registered', linked: false});
  const view = await mount(IdentityRegistrationProgress);
  const initialChecks = mockApi.reconcileRegistration.mock.calls.length;
  await press(button(view, 'Link to wallet'));
  await press(button(view, 'Link to wallet'));
  expect(mockAlert).toHaveBeenCalledTimes(1);
  await act(async () => jest.advanceTimersByTime(20000));
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(initialChecks);
  expect(mockApi.linkRegisteredIdentity).not.toHaveBeenCalled();

  await act(async () => mockAlert.mock.calls[0][2].find(action => action.text === 'Not now').onPress());
  await act(async () => jest.advanceTimersByTime(20000));
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(initialChecks);
  expect(mockApi.linkRegisteredIdentity).not.toHaveBeenCalled();

  await press(button(view, 'Link to wallet'));
  expect(mockAlert).toHaveBeenCalledTimes(2);
  await act(async () => jest.advanceTimersByTime(20000));
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(initialChecks);
  await act(async () => mockAlert.mock.calls[1][2].find(action => action.text === 'Link identity').onPress());
  expect(mockApi.linkRegisteredIdentity).toHaveBeenCalledTimes(1);
  expect(button(view, 'Link to wallet')).toBeUndefined();
  expect(textContent(view.root)).toContain('linked to this wallet');
});

it('keeps the full cost estimate visible when the wallet needs more funding', async () => {
  mockApi.prepareCommitment.mockRejectedValue(Object.assign(new Error('Insufficient funds for both steps.'), {registrationEstimate: {quote, currencyNames: {chain: 'VRSC'}}}));
  const view = await mount(IdentityRegistrationCreate);
  await enterName(view);
  await press(button(view, 'Review costs'));
  expect(view.root.findByType(CostReview).props.quote).toEqual(quote);
  expect(textContent(view.root)).toContain('1.0001 VRSC');
  expect(view.root.findByProps({accessibilityRole: 'alert'}).findByType('Text').children.join('')).toBe('Insufficient funds for both steps.');
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
});

it('scrolls each failed attempt to its error and shows only the button spinner while retrying', async () => {
  const message = 'Insufficient funds for both steps.';
  mockApi.prepareCommitment.mockRejectedValueOnce(new Error(message));
  const view = await mount(IdentityRegistrationCreate);
  await enterName(view);
  expect(mockScrollTo).not.toHaveBeenCalled();
  await press(button(view, 'Review costs'));
  expect(mockScrollTo).toHaveBeenCalledWith({y: 0, animated: true});
  const firstErrorScrolls = mockScrollTo.mock.calls.length;
  expect(view.root.findByProps({accessibilityRole: 'alert'}).findByType('Text').children.join('')).toBe(message);

  let failRetry;
  mockApi.prepareCommitment.mockReturnValueOnce(new Promise((_, reject) => {failRetry = reject;}));
  const retry = button(view, 'Review costs').props.onPress;
  await act(async () => {retry();});
  expect(view.root.findAllByProps({accessibilityRole: 'alert'})).toHaveLength(0);
  expect(mockScrollTo).toHaveBeenCalledTimes(firstErrorScrolls);
  const loadingButton = view.root.findAllByType('Pressable').find(node => node.props.accessibilityLabel === 'Review costs');
  expect(loadingButton.props.disabled).toBe(true);
  expect(loadingButton.findAllByType('ActivityIndicator')).toHaveLength(1);
  expect(view.root.findAllByType('ActivityIndicator')).toHaveLength(1);

  await act(async () => failRetry(new Error(message)));
  expect(mockScrollTo.mock.calls.length).toBeGreaterThan(firstErrorScrolls);
  expect(mockScrollTo).toHaveBeenLastCalledWith({y: 0, animated: true});
  expect(view.root.findByProps({accessibilityRole: 'alert'}).findByType('Text').children.join('')).toBe(message);
  expect(view.root.findAllByType('ActivityIndicator')).toHaveLength(0);
});

it('uses the friendly selected linked VerusID for payment while keeping the wallet key as controller', async () => {
  mockState.authentication.activeAccount.keys.VRSCTEST = {vrpc: {addresses: ['test-wallet']}};
  mockState.coins.activeCoinsForUser = [{id: 'VRSCTEST', system_id: 'test-chain', currency_id: 'test-chain', display_ticker: 'VRSCTEST', testnet: true}];
  mockState.channelStore_verusid.watchedVerusIds = {VRSCTEST: {'test-id': 't1@'}, VRSC: {'main-id': 'main@'}};
  mockState.ledger = {balances: {'vrpc.test-id.test-chain': {VRSCTEST: {confirmed: '1000'}}}};
  const view = await mount(IdentityRegistrationCreate);
  await press(button(view, 'Pay from'));
  expect(radio(view, 't1@')).toBeDefined();
  expect(radio(view, 'main@')).toBeUndefined();
  expect(textContent(view.root)).toContain('1000 VRSCTEST confirmed');
  expect(radio(view, 't1@').props.accessibilityState.selected).toBe(true);
  await press(radio(view, 't1@'));
  await enterName(view);
  await press(button(view, 'Review costs'));
  expect(mockApi.prepareCommitment).toHaveBeenCalledWith({
    request: expect.objectContaining({systemId: 'test-chain', fundingAddress: 'test-id', signingAddress: 'test-wallet', fundingName: 't1@', rootSystemName: 'VRSCTEST'}),
  }, expect.any(Object));
});

it('updates the default when confirmed balances arrive while preserving an explicit payment choice', async () => {
  mockState.channelStore_verusid.watchedVerusIds = {VRSC: {'funded-id': 'funded@'}};
  const navigation = {navigate: jest.fn(), replace: jest.fn()};
  const props = {navigation, route: {params: {}}};
  const view = await mount(IdentityRegistrationCreate, props);
  await press(button(view, 'Pay from'));
  expect(radio(view, 'Wallet address').props.accessibilityState.selected).toBe(true);
  mockState.ledger = {balances: {
    'vrpc.wallet.chain': {VRSC: {confirmed: '2', unconfirmed: '10000'}},
    'vrpc.funded-id.chain': {VRSC: {confirmed: '1000'}},
  }};
  await act(async () => view.update(<IdentityRegistrationCreate {...props} />));
  expect(radio(view, 'funded@').props.accessibilityState.selected).toBe(true);
  await press(radio(view, 'Wallet address'));
  mockState.ledger.balances['vrpc.funded-id.chain'].VRSC.confirmed = '2000';
  await act(async () => view.update(<IdentityRegistrationCreate {...props} />));
  await press(button(view, 'Pay from'));
  expect(radio(view, 'Wallet address').props.accessibilityState.selected).toBe(true);
  await enterName(view);
  await press(button(view, 'Review costs'));
  expect(mockApi.prepareCommitment.mock.calls[0][0].request.fundingAddress).toBe('wallet');
});

it('chooses the funded source on a new network and restores that network’s manual choice', async () => {
  mockState.authentication.activeAccount.keys.VRSCTEST = {vrpc: {addresses: ['test-wallet']}};
  mockState.coins.activeCoinsForUser.push({id: 'VRSCTEST', system_id: 'test-chain', currency_id: 'test-chain', display_ticker: 'VRSCTEST', testnet: true});
  mockState.channelStore_verusid.watchedVerusIds = {VRSC: {'main-id': 'main@'}, VRSCTEST: {'test-id': 'test@'}};
  mockState.ledger = {balances: {
    'vrpc.main-id.chain': {VRSC: {confirmed: '100'}},
    'vrpc.test-id.test-chain': {VRSCTEST: {confirmed: '1000'}},
  }};
  const view = await mount(IdentityRegistrationCreate);
  await press(button(view, 'Pay from'));
  expect(radio(view, 'main@').props.accessibilityState.selected).toBe(true);
  await press(radio(view, 'Wallet address'));
  await press(button(view, 'Network'));
  await press(radio(view, 'VRSCTEST · Testnet'));
  await press(button(view, 'Pay from'));
  expect(radio(view, 'test@').props.accessibilityState.selected).toBe(true);
  await press(button(view, 'Network'));
  await press(radio(view, 'VRSC'));
  expect(radio(view, 'Wallet address').props.accessibilityState.selected).toBe(true);
});

it('compares confirmed native balances exactly and ignores other currencies and unconfirmed funds', () => {
  const coin = {id: 'VRSC', system_id: 'chain'};
  const sources = [{address: 'a'}, {address: 'b'}, {address: 'c'}, {address: 'd'}];
  const balances = {
    'vrpc.a.chain': {VRSC: {confirmed: '9007199254740992.00000001'}},
    'vrpc.b.chain': {VRSC: {confirmed: '9007199254740992.00000002'}},
    'vrpc.c.chain': {VRSC: {confirmed: '0', unconfirmed: '999999999999999999'}, TOKEN: {confirmed: '99999999999999999'}},
    'vrpc.d.chain': {VRSC: {confirmed: 'not-a-number'}},
  };
  expect(preferredRegistrationFundingSource(sources, coin, balances)).toBe(sources[1]);
  expect(preferredRegistrationFundingSource(sources, coin, {})).toBe(sources[0]);
  expect(preferredRegistrationFundingSource([], coin, balances)).toBeUndefined();
});

it('clears the old estimate and funding selection when the network changes', async () => {
  mockState.authentication.activeAccount.keys.VRSCTEST = {vrpc: {addresses: ['test-wallet']}};
  mockState.coins.activeCoinsForUser.push({id: 'VRSCTEST', system_id: 'test-chain', currency_id: 'test-chain', display_ticker: 'VRSCTEST', testnet: true});
  mockState.channelStore_verusid.watchedVerusIds = {VRSC: {'main-id': 'main@'}, VRSCTEST: {'test-id': 't1@'}};
  mockApi.prepareCommitment.mockRejectedValue(Object.assign(new Error('Insufficient funds.'), {registrationEstimate: {quote, currencyNames: {chain: 'VRSC'}}}));
  const view = await mount(IdentityRegistrationCreate);
  await press(button(view, 'Pay from'));
  await press(radio(view, 'main@'));
  await enterName(view);
  await press(button(view, 'Review costs'));
  expect(view.root.findAllByType(CostReview)).toHaveLength(1);
  await press(button(view, 'Network'));
  await press(radio(view, 'VRSCTEST · Testnet'));
  expect(view.root.findAllByType(CostReview)).toHaveLength(0);
  await press(button(view, 'Pay from'));
  expect(radio(view, 'Wallet address').props.accessibilityState.selected).toBe(true);
  expect(radio(view, 'main@')).toBeUndefined();
  expect(radio(view, 't1@').props.accessibilityState.selected).toBe(false);
});

it('shows friendly identity names and only reveals full addresses when explicitly requested', async () => {
  const ownAddress = `i${'A'.repeat(33)}`;
  const fundingAddress = `i${'B'.repeat(33)}`;
  const authorityAddress = `i${'C'.repeat(33)}`;
  const referralAddress = `i${'D'.repeat(33)}`;
  const namespaceAddress = `i${'E'.repeat(33)}`;
  setSavedReview({
    ...review, identityAddress: ownAddress, fundingAddress, fundingName: 't1@', referralID: referralAddress,
    identityNames: {[fundingAddress]: 't1@', [authorityAddress]: 'recovery@', [referralAddress]: 'friend@'},
    currencyNames: {chain: 'VRSCTEST', [namespaceAddress]: 'community@'},
    identity: {parent: namespaceAddress, recoveryauthority: authorityAddress, revocationauthority: ownAddress},
  });
  const view = await mount(IdentityCommitmentReview);
  expect(textContent(view.root)).toContain('Paying from t1@');
  await press(button(view, 'Identity details'));
  const details = textContent(view.root);
  expect(details).toContain('recovery@');
  expect(details).toContain('friend@');
  expect(details).toContain('community@');
  expect(details).toContain('This identity');
  [ownAddress, fundingAddress, authorityAddress, referralAddress, namespaceAddress].forEach(address => {
    expect(details).not.toContain(address);
  });
  await press(button(view, 'Addresses & transactions'));
  expect(textContent(view.root)).toContain(ownAddress);
  expect(textContent(view.root)).toContain(fundingAddress);
});

it('shows a changed registration authority by name before renewed approval even when the price is unchanged', async () => {
  const oldAuthority = `i${'A'.repeat(33)}`;
  const newAuthority = `i${'B'.repeat(33)}`;
  const identityNames = {[oldAuthority]: 'first-issuer@', [newAuthority]: 'new-issuer@'};
  setSavedReview({...review, registrationAuthority: oldAuthority, identityNames});
  mockApi.refreshRegistrationReview.mockResolvedValue({
    ...review, registrationAuthority: newAuthority, identityNames, approvalToken: 'new-authority-token',
  });
  const view = await mount(IdentityCommitmentReview);
  expect(textContent(view.root)).toContain('Registration authorized by first-issuer@');
  expect(textContent(view.root)).not.toContain(oldAuthority);
  await press(checkbox(view));
  await pullRefresh(view);
  expect(view.root.findByType(CostReview).props.quote).toEqual(quote);
  expect(textContent(view.root)).toContain('Registration authorized by new-issuer@');
  expect(textContent(view.root)).not.toContain('first-issuer@');
  expect(textContent(view.root)).not.toContain(newAuthority);
  expect(checkbox(view).props.accessibilityState.checked).toBe(false);
  expect(button(view, 'Pay & commit name').props.disabled).toBe(true);
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
});

it('stacks full cost labels and amounts on a narrow screen with large text', async () => {
  const view = await mount(IdentityCommitmentReview);
  const rows = view.root.findAllByType(AmountRows);
  expect(rows).toHaveLength(2);
  rows.forEach(row => {
    const labels = row.findAllByType('Text');
    const label = labels.find(text => textContent(text) === row.props.label);
    const amount = labels.find(text => textContent(text).endsWith(' VRSC'));
    expect(label).toBeDefined();
    expect(amount).toBeDefined();
    expect(label.parent).toBe(amount.parent);
    const combinedStyle = Object.assign({}, ...label.parent.props.style.filter(Boolean));
    expect(combinedStyle.flexDirection).toBe('column');
    [label, amount].forEach(text => {
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.allowFontScaling).not.toBe(false);
    });
  });
});

it('groups saved registrations by next action, hides completed details, and resumes the chosen job', async () => {
  mockState.channelStore_verusid.registrationJobs = {
    waiting: {id: 'waiting', displayName: 'pending@', status: 'commitment_broadcast', createdAt: 1},
    ready: {id: 'ready', displayName: 'ready@', status: 'commitment_confirmed', createdAt: 2},
    completed: {id: 'completed', displayName: 'finished@', status: 'complete', createdAt: 3},
    cancelled: {id: 'cancelled', displayName: 'hidden@', status: 'cancelled_tracking', createdAt: 4},
  };
  const navigation = {navigate: jest.fn(), replace: jest.fn()};
  const view = await mount(IdentityRegistrationStart, {navigation, route: {params: {coinId: 'VRSCTEST'}}});
  const text = textContent(view.root);
  expect(text).toContain('NEEDS YOU');
  expect(text).toContain('IN PROGRESS');
  expect(text.indexOf('ready@')).toBeLessThan(text.indexOf('pending@'));
  expect(text).not.toContain('finished@');
  expect(text).not.toContain('hidden@');
  await press(button(view, 'ready@'));
  expect(mockApi.prepareRegistration).toHaveBeenCalledWith({jobId: 'ready'}, expect.any(Object));
  expect(navigation.navigate).toHaveBeenLastCalledWith('IdentityRegistrationReview', {jobId: 'ready'});
  await press(button(view, 'Completed (1)'));
  await press(button(view, 'finished@'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('IdentityRegistrationProgress', {jobId: 'completed'});
  await press(button(view, 'Create a VerusID'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('IdentityRegistrationCreate', {coinId: 'VRSCTEST'});
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(mockApi.approveRegistration).not.toHaveBeenCalled();
});

it.each([
  ['commitment_prepared', 'IdentityCommitmentReview'],
  ['registration_prepared', 'IdentityRegistrationReview'],
  ['commitment_broadcast', 'IdentityRegistrationProgress'],
])('opens the next saved screen directly for %s without making a payment', async (status, screen) => {
  mockState.channelStore_verusid.registrationJobs.saved = {id: 'saved', displayName: 'saved@', status, createdAt: 1};
  const navigation = {navigate: jest.fn(), replace: jest.fn()};
  const view = await mount(IdentityRegistrationStart, {navigation});
  await press(button(view, 'saved@'));
  expect(navigation.navigate).toHaveBeenCalledWith(screen, {jobId: 'saved'});
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(mockApi.approveRegistration).not.toHaveBeenCalled();
});

it('returns from progress to saved registrations without creating or resubmitting a transaction', async () => {
  const navigation = {navigate: jest.fn(), replace: jest.fn()};
  setSavedReview({...review, status: 'commitment_broadcast', commitmentTxid: 'sent'});
  const view = await mount(IdentityRegistrationProgress, {navigation});
  await press(button(view, 'Done for now'));
  expect(navigation.navigate).toHaveBeenCalledWith('IdentityRegistrationStart');
  expect(mockApi.retryBroadcast).not.toHaveBeenCalled();
  expect(mockApi.prepareCommitment).not.toHaveBeenCalled();
});

it.each([
  ['draft', 'commitment_prepared', 'No payment has been sent.'],
  ['completed', 'complete', 'Your identity stays registered'],
])('deletes a %s from the home list only after confirmation', async (deletionKind, status, warning) => {
  mockState.channelStore_verusid.registrationJobs.saved = {id: 'saved', displayName: 'saved@', status, deletionKind, createdAt: 1};
  mockApi.deleteRegistration.mockImplementation(async () => { delete mockState.channelStore_verusid.registrationJobs.saved; });
  const view = await mount(IdentityRegistrationStart);
  if (deletionKind === 'completed') await press(button(view, 'Completed (1)'));
  await press(view.root.findByProps({accessibilityLabel: 'Delete saved registration for saved@'}));
  expect(mockApi.deleteRegistration).not.toHaveBeenCalled();
  expect(mockAlert.mock.calls[0][1]).toContain(warning);
  expect(mockAlert.mock.calls[0][2].find(action => action.text === 'Delete').style).toBe('destructive');
  await act(async () => mockAlert.mock.calls[0][2].find(action => action.text === 'Keep registration').onPress());
  expect(mockApi.deleteRegistration).not.toHaveBeenCalled();
  await press(view.root.findByProps({accessibilityLabel: 'Delete saved registration for saved@'}));
  await act(async () => mockAlert.mock.calls[1][2].find(action => action.text === 'Delete').onPress());
  expect(mockApi.deleteRegistration).toHaveBeenCalledWith('saved', deletionKind, expect.any(Object));
  expect(textContent(view.root)).not.toContain('saved@');
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(mockApi.approveRegistration).not.toHaveBeenCalled();
});

it('warns that the original paid commitment fee is lost forever before deleting progress', async () => {
  const navigation = {navigate: jest.fn(), replace: jest.fn()};
  setSavedReview({...review, status: 'commitment_confirmed', deletionKind: 'commitment', commitmentFee: '20000', chainTicker: 'VRSC'});
  const view = await mount(IdentityRegistrationProgress, {navigation});
  await press(button(view, 'Delete saved registration'));
  expect(mockApi.deleteRegistration).not.toHaveBeenCalled();
  expect(mockAlert.mock.calls[0][1]).toContain('0.0002 VRSC commitment fee will be lost forever');
  expect(mockAlert.mock.calls[0][1]).toContain('cannot finish this registration');
  expect(mockAlert.mock.calls[0][1]).not.toContain('0.0001');
  await act(async () => mockAlert.mock.calls[0][2].find(action => action.text === 'Delete').onPress());
  expect(mockApi.deleteRegistration).toHaveBeenCalledWith('job', 'commitment', expect.any(Object));
  expect(navigation.navigate).toHaveBeenCalledWith('IdentityRegistrationStart');
  expect(mockApi.retryBroadcast).not.toHaveBeenCalled();
});

it('shows the exact paid-commitment loss warning from a home summary', async () => {
  mockState.channelStore_verusid.registrationJobs.saved = {
    id: 'saved', displayName: 'saved@', status: 'commitment_confirmed', deletionKind: 'commitment',
    commitmentFee: '10000', systemId: 'test-chain', chainTicker: 'VRSCTEST', createdAt: 1,
  };
  const view = await mount(IdentityRegistrationStart);
  await press(view.root.findByProps({accessibilityLabel: 'Delete saved registration for saved@'}));
  expect(mockAlert.mock.calls[0][1]).toContain('0.0001 VRSCTEST commitment fee will be lost forever');
  expect(mockApi.deleteRegistration).not.toHaveBeenCalled();
});

it('never offers deletion for an unsettled signed registration', async () => {
  setSavedReview({...review, status: 'registration_broadcast', deletionKind: null});
  const progress = await mount(IdentityRegistrationProgress);
  expect(button(progress, 'Delete saved registration')).toBeUndefined();
  mockState.channelStore_verusid.registrationJobs.saved = {id: 'saved', displayName: 'saved@', status: 'registration_signed', deletionKind: null, createdAt: 1};
  const home = await mount(IdentityRegistrationStart);
  expect(home.root.findAllByProps({accessibilityLabel: 'Delete saved registration for saved@'})).toHaveLength(0);
  expect(mockApi.deleteRegistration).not.toHaveBeenCalled();
});

it('passes the deletion kind the user confirmed and keeps a changed registration when deletion is rejected', async () => {
  const navigation = {navigate: jest.fn(), replace: jest.fn()};
  setSavedReview({...review, status: 'commitment_prepared', deletionKind: 'draft'});
  mockApi.deleteRegistration.mockRejectedValueOnce(new Error('Registration changed. Review its updated status before deleting.'));
  const view = await mount(IdentityRegistrationProgress, {navigation});
  await press(button(view, 'Delete saved registration'));
  await act(async () => mockAlert.mock.calls[0][2].find(action => action.text === 'Delete').onPress());
  expect(mockApi.deleteRegistration).toHaveBeenCalledWith('job', 'draft', expect.any(Object));
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(textContent(view.root)).toContain('Registration changed. Review its updated status before deleting.');
});

it('offers linked root and chain identities on a PBaaS network without duplicating sources', () => {
  const coin = {id: 'CHAIN', testnet: true};
  const account = {keys: {CHAIN: {vrpc: {addresses: ['wallet']}}}};
  const sources = registrationFundingSources(coin, account, {
    VRSCTEST: {'root-id': 'root@', 'chain-id': 'old name', wallet: 'duplicate'},
    CHAIN: {'chain-id': 'chain@'}, VRSC: {'wrong-network': 'main@'},
  });
  expect(sources).toEqual([
    {address: 'wallet', signingAddress: 'wallet', fundingName: 'Wallet address', isIdentity: false},
    {address: 'chain-id', signingAddress: 'wallet', fundingName: 'chain@', isIdentity: true},
    {address: 'root-id', signingAddress: 'wallet', fundingName: 'root@', isIdentity: true},
  ]);
  expect(registrationFundingSources(coin, {keys: {}}, {})).toEqual([]);
});

it('a rejected price approval exposes an immediate refresh and requires renewed acceptance', async () => {
  mockApi.approveCommitment.mockRejectedValueOnce(new Error('Registration costs changed. Review the updated amounts.'));
  const view = await mount(IdentityCommitmentReview);
  await press(checkbox(view));
  await press(button(view, 'Pay & commit name'));
  expect(button(view, 'Pay & commit name').props.disabled).toBe(true);
  expect(button(view, 'Refresh review')).toBeDefined();
  await press(button(view, 'Refresh review'));
  expect(checkbox(view).props.accessibilityState.checked).toBe(false);
  expect(button(view, 'Pay & commit name').props.disabled).toBe(true);
  expect(mockApi.approveCommitment).toHaveBeenCalledTimes(1);
});

it('keeps manual review retries out of the pull indicator and reveals pull errors after refreshing stops', async () => {
  mockApi.approveCommitment.mockRejectedValueOnce(new Error('Registration costs changed.'));
  const view = await mount(IdentityCommitmentReview);
  const refreshControl = () => view.root.findByType('ScrollView').props.refreshControl;
  const indicatorStateWhenScrolled = [];
  mockScrollTo.mockImplementation(() => indicatorStateWhenScrolled.push(refreshControl().props.refreshing));
  await press(checkbox(view));
  await press(button(view, 'Pay & commit name'));
  const initialErrorScrolls = mockScrollTo.mock.calls.length;
  expect(initialErrorScrolls).toBeGreaterThan(0);

  let failManualRefresh;
  mockApi.refreshRegistrationReview.mockReturnValueOnce(new Promise((_, reject) => {failManualRefresh = reject;}));
  const manualRefresh = button(view, 'Refresh review').props.onPress;
  await act(async () => {manualRefresh();});
  expect(refreshControl().props.refreshing).toBe(false);
  expect(view.root.findAllByProps({accessibilityRole: 'alert'})).toHaveLength(0);
  expect(mockScrollTo).toHaveBeenCalledTimes(initialErrorScrolls);
  await act(async () => failManualRefresh(new Error('Connection unavailable')));
  const manualErrorScrolls = mockScrollTo.mock.calls.length;
  expect(manualErrorScrolls).toBeGreaterThan(initialErrorScrolls);
  expect(refreshControl().props.refreshing).toBe(false);

  let failPullRefresh;
  mockApi.refreshRegistrationReview.mockReturnValueOnce(new Promise((_, reject) => {failPullRefresh = reject;}));
  await act(async () => {refreshControl().props.onRefresh();});
  expect(refreshControl().props.refreshing).toBe(true);
  expect(mockScrollTo).toHaveBeenCalledTimes(manualErrorScrolls);
  await act(async () => failPullRefresh(new Error('Connection unavailable')));
  expect(refreshControl().props.refreshing).toBe(false);
  expect(mockScrollTo.mock.calls.length).toBeGreaterThan(manualErrorScrolls);
  expect(mockScrollTo).toHaveBeenLastCalledWith({y: 0, animated: true});
  expect(indicatorStateWhenScrolled.every(refreshing => refreshing === false)).toBe(true);
  expect(view.root.findByProps({accessibilityRole: 'alert'}).findByType('Text').children.join('')).toBe('Connection unavailable');

  let finishAccessibleRefresh;
  mockApi.refreshRegistrationReview.mockReturnValueOnce(new Promise(resolve => {finishAccessibleRefresh = resolve;}));
  await act(async () => {
    view.root.findByType('ScrollView').props.onAccessibilityAction({nativeEvent: {actionName: 'refresh'}});
  });
  expect(refreshControl().props.refreshing).toBe(false);
  await act(async () => finishAccessibleRefresh({...review}));
  expect(mockApi.refreshRegistrationReview).toHaveBeenCalledTimes(3);
});

it('a failed saved-review load offers a retry without leaving the screen', async () => {
  mockApi.getRegistrationReview.mockRejectedValueOnce(new Error('Connection unavailable'));
  const view = await mount(IdentityCommitmentReview);
  await press(footerAction(view, 'Try again'));
  expect(mockApi.getRegistrationReview).toHaveBeenCalledTimes(2);
  expect(footerAction(view, 'Pay & commit name').props.disabled).toBe(true);
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
});
