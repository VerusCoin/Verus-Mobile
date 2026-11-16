const mockApi = {
  createRegistrationContext: jest.fn(() => ({sessionScope: {accountHash: 'account', sessionEpoch: 1}})),
  resolveRegistration: jest.fn(), prepareCommitment: jest.fn(), getRegistrationReview: jest.fn(),
  approveCommitment: jest.fn(), prepareRegistration: jest.fn(), approveRegistration: jest.fn(),
  retryBroadcast: jest.fn(), reconcileRegistration: jest.fn(), refreshRegistrationReview: jest.fn(),
  findExistingRegistration: jest.fn(), linkRegisteredIdentity: jest.fn(), deleteRegistration: jest.fn(),
  getRegistrationEstimate: jest.fn(),
  registrationQuotesEqual: (...args) => jest.requireActual('../../identityRegistration/costs').registrationQuotesEqual(...args),
};
let mockState;
const mockAlert = jest.fn();
const mockScrollTo = jest.fn();
const mockPublishRegistrationJobs = jest.fn();
const mockClearRegistrationJobs = jest.fn();
const mockUpdateRegistrationUiState = jest.fn();
const mockReadRegistrationBalances = jest.fn();
const mockCheckRegistrationFunds = jest.fn();
const mockGetRegistrationReferralInfo = jest.fn();
const mockRegistrationReferralNamespace = jest.fn();
jest.mock('../../identityRegistration', () => mockApi);
jest.mock('../../identityRegistration/referrals', () => ({
  getRegistrationReferralInfo: (...args) => mockGetRegistrationReferralInfo(...args),
  registrationReferralNamespace: (...args) => mockRegistrationReferralNamespace(...args),
}));
jest.mock('../../../actions/actions/services/dispatchers/verusid/registration', () => ({
  publishRegistrationJobs: (...args) => mockPublishRegistrationJobs(...args),
  clearRegistrationJobs: (...args) => mockClearRegistrationJobs(...args),
  updateRegistrationUiState: (...args) => mockUpdateRegistrationUiState(...args),
}));
jest.mock('../../identityRegistration/funding', () => ({
  ...jest.requireActual('../../identityRegistration/funding'),
  readRegistrationBalances: (...args) => mockReadRegistrationBalances(...args),
  checkRegistrationFunds: (...args) => mockCheckRegistrationFunds(...args),
}));
jest.mock('react-redux', () => require('../../../tests/helpers/mockReactRedux')({useSelector: selector => selector(mockState)}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: callback => require('react').useEffect(callback, [callback]),
  useNavigation: () => ({isFocused: () => true, addListener: () => jest.fn(), getParent: () => undefined}),
}));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('../../../components/SemiModal', () => ({visible, children}) => visible ? children : null);
jest.mock('../../identityLinking/identityLinking', () => ({
  captureIdentityLinkContext: jest.fn(), discoverLinkableIdentities: jest.fn(), linkSelectedIdentities: jest.fn(),
}));
jest.mock('../../../actions/actions/notifications/dispatchers/notifications', () => ({dispatchRemoveNotification: jest.fn()}));
jest.mock('@react-navigation/elements', () => ({useHeaderHeight: () => 96}));
jest.mock('react-native', () => require('../../../tests/helpers/mockReactNative')({
  AppState: {currentState: 'active', addEventListener: () => ({remove: jest.fn()})},
  View: 'View', ScrollView: 'ScrollView', KeyboardAvoidingView: 'KeyboardAvoidingView',
  RefreshControl: 'RefreshControl', Alert: {alert: mockAlert}, Keyboard: {dismiss: jest.fn(), addListener: () => ({remove: jest.fn()})},
  Platform: {OS: 'ios'}, StyleSheet: {create: value => value, hairlineWidth: 1},
  useWindowDimensions: () => ({width: 320, height: 640, fontScale: 2}),
}));
jest.mock('react-native-paper', () => ({
  ...jest.requireActual('react-native-paper'), Portal: 'Portal', Text: 'Text', TextInput: 'TextInput', ActivityIndicator: 'ActivityIndicator',
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {findCoinObj: () => undefined}}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {
  IdentityRegistrationStart, IdentityRegistrationCreate, IdentityCommitmentReview,
  IdentityRegistrationReview, IdentityRegistrationProgress,
} = require('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/RegistrationScreens');
const {CostReview, AmountRows} = require('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/RegistrationComponents');
const AppButton = require('../../../components/AppButton').default;
const SlideToConfirm = require('../../../components/SlideToConfirm').default;
const TextAction = require('../../../components/TextAction').default;
const AcknowledgeSheet = require('../../../components/AcknowledgeSheet').default;
const {preferredRegistrationFundingSource, registrationFundingSources} = require('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/fundingSources');
const quote = {
  branch: 'native', systemID: 'chain', parentID: 'chain', issuerID: 'chain', commitmentFee: '10000',
  registrationOffer: '100000000', nativeFee: '0', importFee: '0', transferFee: '0', referralPayments: [],
  totalOperationRequired: {chain: '100010000'}, totalRequired: {chain: '100000000'},
};
const review = {
  jobId: 'job', revision: 4, approvalToken: 'review-token', status: 'commitment_prepared', displayName: 'alice@', chainTicker: 'VRSC',
  quote, systemId: 'chain', currencyNames: {chain: 'VRSC'}, identityAddress: 'identity',
  identity: {primaryaddresses: ['wallet']}, fundingName: 'Wallet address',
  fundingAddress: 'wallet', signingAddress: 'wallet', linked: false,
};
const PRIVATE_ADDRESS = 'zs1wczplx4kegw32h8g0f7xwl57p5tvnprwdmnzmdnsw50chcl26f7tws92wk2ap03ykaq6jyyztfa';
const setSavedReview = value => {
  mockApi.getRegistrationReview.mockResolvedValue(value);
  mockApi.reconcileRegistration.mockResolvedValue(value);
};
const textContent = node => typeof node === 'string' ? node : (node.children || []).map(textContent).join('');
const button = (view, label) => view.root.findAllByType('Pressable').find(node =>
  node.props.accessibilityRole === 'button' && node.findAllByType('Text').some(text => textContent(text) === label));
const checkbox = view => view.root.findAllByType('Pressable').find(node => node.props.accessibilityRole === 'checkbox');
// A footer action is a button or a slide. It lives in the fixed footer, never in the scrolling content.
const footerAction = (view, label) => {
  const matches = node => (node.type === SlideToConfirm && node.props.label === label) ||
    (node.type === AppButton && node.props.children === label);
  const found = view.root.findAll(matches);
  expect(found).toHaveLength(1);
  expect(view.root.findByType('ScrollView').findAll(matches)).toHaveLength(0);
  expect(view.root.findByProps({testID: 'registration-footer'}).findAll(matches)).toEqual(found);
  return found[0];
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
const referralField = view => view.root.findAllByType('TextInput').find(node => node.props.label === 'Referral (optional)');
const enterReferral = async (view, referral) => {
  await act(async () => referralField(view).props.onChangeText(referral));
};
let views;
const makeNavigation = overrides => ({
  navigate: jest.fn(), replace: jest.fn(), addListener: jest.fn(() => jest.fn()),
  getParent: () => ({goBack: jest.fn(), reset: jest.fn()}), ...overrides,
});
const mount = async (Component, props = {}) => {
  let view;
  await act(async () => {
    view = create(<Component navigation={props.navigation || makeNavigation()} route={{params: {jobId: 'job'}}} {...props} />, {
      createNodeMock: node => node.type === 'ScrollView' ? {scrollTo: mockScrollTo} : null,
    });
  });
  views.push(view);
  return view;
};
beforeEach(() => {
  jest.clearAllMocks();
  mockScrollTo.mockReset();
  mockPublishRegistrationJobs.mockReset().mockResolvedValue({});
  mockClearRegistrationJobs.mockReset().mockImplementation(async () => {
    mockState.channelStore_verusid.registrationJobs = {};
  });
  mockGetRegistrationReferralInfo.mockReset().mockResolvedValue({
    discount: '2000000000', reward: '2000000000', currencyID: 'chain', currencyName: 'VRSC', enabled: true,
  });
  mockRegistrationReferralNamespace.mockReset().mockImplementation(({systemId}) => systemId);
  views = [];
  mockState = {
    authentication: {activeAccount: {keys: {VRSC: {vrpc: {addresses: ['wallet']}}}}},
    coins: {activeCoinsForUser: [{id: 'VRSC', system_id: 'chain', currency_id: 'chain', display_ticker: 'VRSC'}]},
    channelStore_verusid: {registrationJobs: {}},
    settings: {generalWalletSettings: {}}, modal: {stack: []}, ledger: {balances: {}, rates: {}},
  };
  mockUpdateRegistrationUiState.mockReset().mockResolvedValue(undefined);
  mockReadRegistrationBalances.mockReset().mockResolvedValue({status: 'ready', amounts: {chain: '10'}});
  mockCheckRegistrationFunds.mockReset().mockResolvedValue({status: 'enough'});
  mockApi.getRegistrationEstimate.mockReset().mockResolvedValue({...review, status: 'commitment_confirmed'});
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

it('waits for saved summaries before showing an empty registration list or enabling creation', async () => {
  let finishLoading;
  mockPublishRegistrationJobs.mockReturnValueOnce(new Promise(resolve => { finishLoading = resolve; }));
  const view = await mount(IdentityRegistrationStart);

  expect(mockPublishRegistrationJobs).toHaveBeenCalledWith({sessionScope: {accountHash: 'account', sessionEpoch: 1}});
  expect(footerAction(view, 'Create a VerusID').props.disabled).toBe(true);
  expect(textContent(view.root)).not.toContain('A name that’s yours');
  expect(view.root.findByType('ScrollView').props.refreshControl.props.refreshing).toBe(true);

  await act(async () => finishLoading({}));

  expect(footerAction(view, 'Create a VerusID').props.disabled).toBeFalsy();
  expect(textContent(view.root)).toContain('A name that’s yours');
  expect(mockApi.reconcileRegistration).not.toHaveBeenCalled();
  expect(mockApi.prepareCommitment).not.toHaveBeenCalled();
});

it.each([new Error('Unsupported receipt with protected transaction bytes'), null])('shows a retryable load error without exposing receipt details or offering a fresh registration (%p)', async failure => {
  mockPublishRegistrationJobs.mockRejectedValueOnce(failure);
  const view = await mount(IdentityRegistrationStart);

  expect(textContent(view.root)).toContain('Saved registrations could not be loaded. Your registration data has not been changed.');
  expect(textContent(view.root)).not.toContain('protected transaction bytes');
  expect(textContent(view.root)).not.toContain('A name that’s yours');
  expect(footerAction(view, 'Create a VerusID').props.disabled).toBe(true);
  expect(view.root.findAllByProps({accessibilityRole: 'alert'})).toHaveLength(1);

  await press(button(view, 'Retry loading registrations'));

  expect(mockPublishRegistrationJobs).toHaveBeenCalledTimes(2);
  expect(view.root.findAllByProps({accessibilityRole: 'alert'})).toHaveLength(0);
  expect(footerAction(view, 'Create a VerusID').props.disabled).toBeFalsy();
  expect(textContent(view.root)).toContain('A name that’s yours');
  expect(mockApi.deleteRegistration).not.toHaveBeenCalled();
  expect(mockApi.prepareCommitment).not.toHaveBeenCalled();
  expect(mockApi.reconcileRegistration).not.toHaveBeenCalled();
});

it('keeps last known registrations visible but disables actions until their summaries reload', async () => {
  mockState.channelStore_verusid.registrationJobs.saved = {
    id: 'saved', displayName: 'saved@', status: 'commitment_prepared', deletionKind: 'draft', createdAt: 1,
  };
  mockPublishRegistrationJobs.mockRejectedValueOnce(new Error('Storage unavailable'));
  const view = await mount(IdentityRegistrationStart);

  expect(textContent(view.root)).toContain('saved@');
  expect(button(view, 'saved@').props.disabled).toBe(true);
  expect(view.root.findByProps({accessibilityLabel: 'Delete saved registration for saved@'}).props.disabled).toBe(true);

  await pullRefresh(view);

  expect(button(view, 'saved@').props.disabled).toBe(false);
  expect(view.root.findByProps({accessibilityLabel: 'Delete saved registration for saved@'}).props.disabled).toBe(false);
  expect(mockState.channelStore_verusid.registrationJobs.saved.id).toBe('saved');
  expect(mockApi.deleteRegistration).not.toHaveBeenCalled();
});

it('does not show a registration storage error after the originating account changes', async () => {
  mockPublishRegistrationJobs.mockRejectedValueOnce(Object.assign(new Error('Account changed'), {code: 'SESSION_CHANGED'}));
  const view = await mount(IdentityRegistrationStart);

  expect(view.root.findAllByProps({accessibilityRole: 'alert'})).toHaveLength(0);
  expect(footerAction(view, 'Create a VerusID').props.disabled).toBe(true);
  expect(textContent(view.root)).not.toContain('A name that’s yours');
});

it('only offers the registration reset after a failed summary load', async () => {
  const view = await mount(IdentityRegistrationStart);

  expect(button(view, 'Clear all registration data')).toBeUndefined();
  expect(mockClearRegistrationJobs).not.toHaveBeenCalled();
});

it.each(['cancel', 'dismiss'])('keeps registration data when the reset confirmation is closed with %s', async choice => {
  mockPublishRegistrationJobs.mockRejectedValueOnce(new Error('Unsupported registration storage'));
  const view = await mount(IdentityRegistrationStart);

  await press(button(view, 'Clear all registration data'));
  await press(button(view, 'Clear all registration data'));

  expect(mockAlert).toHaveBeenCalledTimes(1);
  const [title, message, actions, options] = mockAlert.mock.calls[0];
  expect(title).toBe('Clear all registration data?');
  expect(message).toContain('Are you sure?');
  expect(message).toContain('commitment secrets for this profile');
  expect(message).toContain('fees already paid will not be refunded');
  expect(message).toContain('This cannot be undone');
  expect(actions.find(action => action.text === 'Clear all registration data').style).toBe('destructive');
  expect(mockClearRegistrationJobs).not.toHaveBeenCalled();

  await act(async () => choice === 'cancel'
    ? actions.find(action => action.style === 'cancel').onPress()
    : options.onDismiss());

  expect(mockClearRegistrationJobs).not.toHaveBeenCalled();
  expect(button(view, 'Retry loading registrations')).toBeDefined();
  await press(button(view, 'Clear all registration data'));
  expect(mockAlert).toHaveBeenCalledTimes(2);
});

it('clears registrations only after confirmation and shows the fresh state only after saving', async () => {
  mockState.channelStore_verusid.registrationJobs.saved = {
    id: 'saved', displayName: 'saved@', status: 'commitment_broadcast', createdAt: 1,
  };
  mockPublishRegistrationJobs.mockRejectedValueOnce(new Error('Unsupported registration storage'));
  let finishClear;
  mockClearRegistrationJobs.mockImplementationOnce(() => new Promise(resolve => {
    finishClear = () => {
      mockState.channelStore_verusid.registrationJobs = {};
      resolve();
    };
  }));
  const view = await mount(IdentityRegistrationStart);
  await press(button(view, 'Clear all registration data'));
  expect(mockClearRegistrationJobs).not.toHaveBeenCalled();
  const confirm = mockAlert.mock.calls[0][2].find(action => action.style === 'destructive').onPress;
  let saving;

  await act(async () => { saving = confirm(); });
  await act(async () => confirm());

  expect(mockClearRegistrationJobs).toHaveBeenCalledTimes(1);
  expect(mockClearRegistrationJobs).toHaveBeenCalledWith({sessionScope: {accountHash: 'account', sessionEpoch: 1}});
  expect(footerAction(view, 'Create a VerusID').props.disabled).toBe(true);
  expect(textContent(view.root)).not.toContain('A name that’s yours');

  await act(async () => { finishClear(); await saving; });

  expect(view.root.findAllByProps({accessibilityRole: 'alert'})).toHaveLength(0);
  expect(textContent(view.root)).toContain('A name that’s yours');
  expect(textContent(view.root)).not.toContain('saved@');
  expect(footerAction(view, 'Create a VerusID').props.disabled).toBeFalsy();
  expect(button(view, 'Clear all registration data')).toBeUndefined();
  expect(mockApi.prepareCommitment).not.toHaveBeenCalled();
  expect(mockApi.deleteRegistration).not.toHaveBeenCalled();
});

it('keeps the recovery controls and saved rows when clearing registration data fails', async () => {
  mockState.channelStore_verusid.registrationJobs.saved = {
    id: 'saved', displayName: 'saved@', status: 'commitment_broadcast', createdAt: 1,
  };
  mockPublishRegistrationJobs.mockRejectedValueOnce(new Error('Unsupported registration storage'));
  mockClearRegistrationJobs.mockRejectedValueOnce(new Error('Unable to save registration reset.'));
  const view = await mount(IdentityRegistrationStart);
  await press(button(view, 'Clear all registration data'));
  await act(async () => mockAlert.mock.calls[0][2].find(action => action.style === 'destructive').onPress());

  expect(textContent(view.root)).toContain('Unable to save registration reset.');
  expect(textContent(view.root)).toContain('saved@');
  expect(textContent(view.root)).not.toContain('A name that’s yours');
  expect(footerAction(view, 'Create a VerusID').props.disabled).toBe(true);
  expect(button(view, 'Retry loading registrations')).toBeDefined();
  expect(button(view, 'Clear all registration data')).toBeDefined();
});

const secondPayment = status => {
  mockApi.prepareRegistration.mockResolvedValue({...review, status: 'registration_prepared'});
  mockApi.refreshRegistrationReview.mockResolvedValue({...review, status: 'registration_prepared'});
  mockApi.getRegistrationEstimate.mockResolvedValue({...review, status});
};

it.each([
  ['commitment', IdentityCommitmentReview, 'commitment_prepared', 'Slide to start'],
  ['registration', IdentityRegistrationProgress, 'registration_prepared', 'Slide to create'],
])('keeps the %s approval together with its single fixed payment action', async (_, Component, status, label) => {
  setSavedReview({...review, status});
  secondPayment(status);
  const view = await mount(Component);
  // One deliberate slide replaces the cost checkbox and the payment button.
  expect(footerAction(view, label).props.disabled).toBe(false);
  expect(view.root.findAllByType(SlideToConfirm)).toHaveLength(1);
  expect(view.root.findByType('ScrollView').findAllByType(SlideToConfirm)).toHaveLength(0);
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(mockApi.approveRegistration).not.toHaveBeenCalled();
});

it.each([
  ['commitment', IdentityCommitmentReview, 'commitment_prepared', 'Slide to start'],
  ['registration', IdentityRegistrationProgress, 'registration_prepared', 'Slide to create'],
])('retains a named disabled %s payment action while its review is loading', async (_, Component, status, label) => {
  secondPayment(status);
  let finishLoading;
  mockApi.getRegistrationReview.mockReturnValueOnce(new Promise(resolve => {finishLoading = resolve;}));
  const view = await mount(Component);
  const action = footerAction(view, label);
  expect(action.props.disabled).toBe(true);
  expect(action.props.loading).toBeFalsy();
  expect(action.findAllByType('ActivityIndicator')).toHaveLength(0);
  await act(async () => finishLoading({...review, status}));
  expect(footerAction(view, label).props.disabled).toBe(false);
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(mockApi.approveRegistration).not.toHaveBeenCalled();
});

it.each([
  ['commitment_prepared', 'Slide to start'],
  ['commitment_expired', 'Slide to start'],
  ['commitment_confirmed', 'Slide to create'],
  ['registration_prepared', 'Slide to create'],
  ['registration_expired', 'Slide to create'],
  ['commitment_broadcast', 'Done for now'],
  ['registration_broadcast', 'Done for now'],
  ['commitment_signed', 'Retry sending'],
  ['registration_signed', 'Retry sending'],
  ['commitment_spent', 'Check status'],
])('keeps the %s progress action in the fixed footer without a duplicate scrolling action', async (status, label) => {
  setSavedReview({...review, status});
  mockApi.getRegistrationEstimate.mockResolvedValue({...review, status});
  mockApi.prepareRegistration.mockResolvedValue({...review, status: 'registration_prepared'});
  mockApi.refreshRegistrationReview.mockResolvedValue({...review, status: 'registration_prepared'});
  const view = await mount(IdentityRegistrationProgress);
  footerAction(view, label);
});

it.each([['registered', 'VerusID created'], ['complete', 'VerusID created']])('shows the %s result with its Link VerusID action instead of the progress footer', async (status, title) => {
  setSavedReview({...review, status});
  const view = await mount(IdentityRegistrationProgress);
  expect(textContent(view.root)).toContain(title);
  expect(view.root.findAllByType(AppButton).some(node => node.props.children === 'Link VerusID')).toBe(true);
  expect(view.root.findAllByProps({testID: 'registration-footer'})).toHaveLength(0);
});

it('keeps a failed initial progress check retryable through one footer action', async () => {
  mockApi.reconcileRegistration.mockRejectedValueOnce(new Error('Connection unavailable'));
  const view = await mount(IdentityRegistrationProgress);
  await press(footerAction(view, 'Try again'));
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(2);
  footerAction(view, 'Slide to start');
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
});

it('requires explicit commitment cost acceptance and does not also approve registration', async () => {
  const navigation = makeNavigation();
  const view = await mount(IdentityCommitmentReview, {navigation});
  expect(textContent(view.root)).toContain('You pay');
  expect(textContent(view.root)).toContain('1.0001 VRSC');
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(footerAction(view, 'Slide to start').props.disabled).toBe(false);
  await act(async () => footerAction(view, 'Slide to start').props.onPress());
  expect(mockApi.approveCommitment).toHaveBeenCalledTimes(1);
  expect(mockApi.approveCommitment).toHaveBeenCalledWith('job', 'review-token', expect.any(Object));
  expect(mockApi.approveRegistration).not.toHaveBeenCalled();
  expect(navigation.replace).toHaveBeenCalledWith('IdentityRegistrationProgress', {jobId: 'job'});
});

it.each([
  [IdentityCommitmentReview, 'commitment_prepared', 'Slide to start', 'approveCommitment'],
  [IdentityRegistrationProgress, 'registration_prepared', 'Slide to create', 'approveRegistration'],
])('prevents double taps from signing either payment twice', async (Component, status, label, method) => {
  let complete;
  setSavedReview({...review, status});
  secondPayment(status);
  mockApi[method].mockReturnValue(new Promise(resolve => {complete = resolve;}));
  const view = await mount(Component);
  const onPress = footerAction(view, label).props.onPress;
  await act(async () => {onPress(); onPress();});
  expect(mockApi[method]).toHaveBeenCalledTimes(1);
  await act(async () => complete({...review, status: status.replace('prepared', 'broadcast')}));
});

it('continuing after confirmation prepares a separate registration review without paying', async () => {
  setSavedReview({...review, status: 'commitment_confirmed', commitmentTxid: 'txid'});
  mockApi.prepareRegistration.mockResolvedValue({...review, status: 'registration_prepared'});
  const navigation = makeNavigation();
  const view = await mount(IdentityRegistrationProgress, {navigation});
  expect(mockApi.prepareRegistration).toHaveBeenCalledWith({jobId: 'job'}, expect.any(Object));
  expect(mockApi.approveRegistration).not.toHaveBeenCalled();
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(footerAction(view, 'Slide to create').props.disabled).toBe(false);
  expect(navigation.navigate).not.toHaveBeenCalled();
});

it('does not offer to register an unconfirmed name commitment', async () => {
  setSavedReview({...review, status: 'commitment_broadcast', commitmentTxid: 'txid'});
  const view = await mount(IdentityRegistrationProgress);
  expect(footerAction(view, 'Slide to create').props.disabled).toBe(true);
  expect(mockApi.prepareRegistration).not.toHaveBeenCalled();
  expect(textContent(view.root)).toContain('Confirming commitment');
  expect(footerAction(view, 'Done for now')).toBeDefined();
});

it('keeps passive status checks out of action loading and stops polling when ready', async () => {
  jest.useFakeTimers();
  setSavedReview({...review, status: 'commitment_broadcast'});
  mockApi.prepareRegistration.mockResolvedValue({...review, status: 'registration_prepared'});
  const view = await mount(IdentityRegistrationProgress);
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(1);
  let finishPoll;
  mockApi.reconcileRegistration.mockReturnValueOnce(new Promise(resolve => {finishPoll = resolve;}));
  await act(async () => { jest.advanceTimersByTime(20000); });
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(2);
  expect(footerAction(view, 'Done for now').props.disabled).toBeFalsy();
  expect(footerAction(view, 'Slide to create').props.loading).toBeFalsy();
  expect(view.root.findAllByType('ActivityIndicator')).toHaveLength(0);
  expect(mockApi.reconcileRegistration.mock.calls[1][1]).toMatchObject({registrationBackground: true});
  await act(async () => finishPoll({...review, status: 'commitment_confirmed'}));
  expect(footerAction(view, 'Slide to create').props.disabled).toBe(false);
  await act(async () => { jest.advanceTimersByTime(60000); });
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(2);
  expect(view.root.findAllByType('ActivityIndicator')).toHaveLength(0);
});

it('aborts a passive check before a foreground action and ignores its stale result', async () => {
  jest.useFakeTimers();
  setSavedReview({...review, status: 'commitment_broadcast'});
  mockApi.prepareRegistration.mockResolvedValue({...review, status: 'registration_prepared'});
  const view = await mount(IdentityRegistrationProgress);
  let finishPoll;
  mockApi.reconcileRegistration
    .mockReturnValueOnce(new Promise(resolve => {finishPoll = resolve;}))
    .mockResolvedValueOnce({...review, status: 'commitment_confirmed'});
  await act(async () => { jest.advanceTimersByTime(20000); });
  const passiveContext = mockApi.reconcileRegistration.mock.calls[1][1];
  await act(async () => { view.root.findByType('ScrollView').props.refreshControl.props.onRefresh(); });
  expect(passiveContext.signal.aborted).toBe(true);
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(2);
  await act(async () => finishPoll({...review, status: 'registered'}));
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(3);
  expect(mockApi.reconcileRegistration.mock.calls[2][1].registrationBackground).toBeUndefined();
  expect(footerAction(view, 'Slide to create')).toBeDefined();
  expect(textContent(view.root)).not.toContain('VerusID created');
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
  secondPayment('registration_prepared');
  const view = await mount(IdentityRegistrationProgress);
  expect(textContent(view.root)).toContain('Confirmed.');
  expect(textContent(view.root)).toContain('Registration');
  expect(footerAction(view, 'Slide to create').props.disabled).toBe(false);
  await act(async () => footerAction(view, 'Slide to create').props.onPress());
  expect(mockApi.approveRegistration).toHaveBeenCalledWith('job', 'review-token', expect.any(Object));
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
});

it('saves a payment review for later without approving either payment', async () => {
  const goBack = jest.fn();
  const navigation = makeNavigation({getParent: () => ({goBack, reset: jest.fn()})});
  const view = await mount(IdentityCommitmentReview, {navigation});
  await press(footerAction(view, 'Save for later'));
  expect(goBack).toHaveBeenCalledTimes(1);
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
  expect(mockApi.prepareCommitment.mock.calls[0][0].request.privateAddress).toBeUndefined();
});

it.each([
  ['VRSC', 'chain', false],
  ['VRSCTEST', 'test-chain', true],
])('defaults %s referrals to the foundation and submits the displayed value', async (id, systemId, testnet) => {
  mockState.authentication.activeAccount.keys[id] = {vrpc: {addresses: ['wallet']}};
  mockState.coins.activeCoinsForUser = [{id, system_id: systemId, currency_id: systemId, display_ticker: id, testnet}];
  mockGetRegistrationReferralInfo.mockResolvedValue({
    discount: '2000000000', reward: '2000000000', currencyID: systemId, currencyName: id, enabled: true,
  });
  const view = await mount(IdentityRegistrationCreate);

  expect(referralField(view).props.value).toBe('Verus Coin Foundation@');
  expect(button(view, 'set to Verus Coin Foundation@')).toBeDefined();
  expect(textContent(view.root)).toContain(`Using an eligible referral makes your ID 20 ${id} cheaper and gives the referrer 20 ${id}.`);
  await enterName(view);
  await press(button(view, 'Review costs'));

  expect(mockApi.prepareCommitment.mock.calls[0][0].request.referralID).toBe('Verus Coin Foundation@');
});

it('lets a cleared referral stay empty through name edits and submission, and restores it with the foundation button', async () => {
  const view = await mount(IdentityRegistrationCreate);
  await enterReferral(view, '');
  await enterName(view);
  expect(referralField(view).props.value).toBe('');
  await press(button(view, 'Review costs'));
  expect(mockApi.prepareCommitment.mock.calls[0][0].request).not.toHaveProperty('referralID');

  await press(button(view, 'set to Verus Coin Foundation@'));
  expect(referralField(view).props.value).toBe('Verus Coin Foundation@');
});

it('clears the default referral as soon as a dot is entered, including after switching networks', async () => {
  mockState.authentication.activeAccount.keys.VRSCTEST = {vrpc: {addresses: ['test-wallet']}};
  mockState.coins.activeCoinsForUser.push({
    id: 'VRSCTEST', system_id: 'test-chain', currency_id: 'test-chain', display_ticker: 'VRSCTEST', testnet: true,
  });
  const view = await mount(IdentityRegistrationCreate);
  expect(referralField(view).props.value).toBe('Verus Coin Foundation@');

  await enterName(view, 'alice.');
  expect(referralField(view).props.value).toBe('');
  await enterName(view, 'alice.community@');
  await press(button(view, 'Review costs'));
  expect(mockApi.prepareCommitment.mock.calls[0][0].request).not.toHaveProperty('referralID');

  await press(button(view, 'Network'));
  await press(radio(view, 'VRSCTEST · Testnet'));
  expect(referralField(view).props.value).toBe('');

  await enterReferral(view, 'friend.community@');
  await enterName(view, 'bob.community@');
  expect(referralField(view).props.value).toBe('friend.community@');
  await press(button(view, 'Review costs'));
  expect(mockApi.prepareCommitment.mock.calls[1][0].request.referralID).toBe('friend.community@');
});

it.each([false, true])('keeps the referral explanation on another chain without a foundation default or button (testnet=%s)', async testnet => {
  mockState.authentication.activeAccount.keys.CHAIN = {vrpc: {addresses: ['chain-wallet']}};
  mockState.coins.activeCoinsForUser = [{
    id: 'CHAIN', system_id: 'other-chain', currency_id: 'other-chain', display_ticker: 'CHAIN', testnet,
  }];
  mockGetRegistrationReferralInfo.mockResolvedValue({
    discount: '1250000000', reward: '375000000', currencyID: 'fee-currency', currencyName: 'FEE', enabled: true,
  });
  const view = await mount(IdentityRegistrationCreate);

  expect(referralField(view).props.value).toBe('');
  expect(button(view, 'set to Verus Coin Foundation@')).toBeUndefined();
  expect(textContent(view.root)).toContain('Using an eligible referral makes your ID 12.5 FEE cheaper and gives the referrer 3.75 FEE.');
  expect(textContent(view.root)).toContain('You’ll see the final price before paying.');
  expect(mockGetRegistrationReferralInfo).toHaveBeenLastCalledWith(expect.objectContaining({
    systemId: 'other-chain', rootSystemName: testnet ? 'VRSCTEST' : 'VRSC', namespaceId: 'other-chain',
  }));
});

it('refreshes referral savings when the identity namespace changes', async () => {
  mockRegistrationReferralNamespace.mockImplementation(({systemId, name}) =>
    name.endsWith('.community@') ? 'community-id' : systemId);
  mockGetRegistrationReferralInfo.mockImplementation(async ({namespaceId}) => ({
    discount: namespaceId === 'community-id' ? '250000000' : '2000000000',
    reward: namespaceId === 'community-id' ? '125000000' : '2000000000',
    currencyID: 'chain', currencyName: 'VRSC', enabled: true,
  }));
  const view = await mount(IdentityRegistrationCreate);
  expect(textContent(view.root)).toContain('makes your ID 20 VRSC cheaper');
  await enterName(view, 'alice.community@');
  expect(mockGetRegistrationReferralInfo).toHaveBeenLastCalledWith(expect.objectContaining({
    systemId: 'chain', rootSystemName: 'VRSC', namespaceId: 'community-id',
  }));
  expect(textContent(view.root)).toContain('makes your ID 2.5 VRSC cheaper and gives the referrer 1.25 VRSC');
});

it('explains when a namespace has no referral discount or reward', async () => {
  mockGetRegistrationReferralInfo.mockResolvedValue({
    discount: '0', reward: '0', currencyID: 'chain', currencyName: 'VRSC', enabled: false,
  });
  const view = await mount(IdentityRegistrationCreate);
  expect(textContent(view.root)).toContain('This namespace does not offer referral discounts or referrer rewards.');
  expect(textContent(view.root)).not.toContain('makes your ID');
});

it('keeps the referral explanation and form available when referral amounts cannot be loaded', async () => {
  mockGetRegistrationReferralInfo.mockRejectedValue(new Error('RPC unavailable'));
  const view = await mount(IdentityRegistrationCreate);
  expect(textContent(view.root)).toContain('An eligible referral can make your ID cheaper and reward the referrer. You’ll see the amounts before paying.');
  await enterName(view);
  expect(button(view, 'Review costs').props.disabled).toBe(false);
});

it('preserves cleared and custom referrals separately when changing networks', async () => {
  mockState.authentication.activeAccount.keys.VRSCTEST = {vrpc: {addresses: ['test-wallet']}};
  mockState.authentication.activeAccount.keys.CHAIN = {vrpc: {addresses: ['chain-wallet']}};
  mockState.coins.activeCoinsForUser.push(
    {id: 'VRSCTEST', system_id: 'test-chain', currency_id: 'test-chain', display_ticker: 'VRSCTEST', testnet: true},
    {id: 'CHAIN', system_id: 'other-chain', currency_id: 'other-chain', display_ticker: 'CHAIN'},
  );
  const view = await mount(IdentityRegistrationCreate);
  await enterReferral(view, '');
  await press(button(view, 'Network'));
  await press(radio(view, 'VRSCTEST · Testnet'));
  expect(referralField(view).props.value).toBe('Verus Coin Foundation@');
  await enterReferral(view, 'friend@');
  await press(button(view, 'Network'));
  await press(radio(view, 'CHAIN'));
  expect(referralField(view).props.value).toBe('');
  expect(button(view, 'set to Verus Coin Foundation@')).toBeUndefined();
  await press(button(view, 'Network'));
  await press(radio(view, 'VRSC'));
  expect(referralField(view).props.value).toBe('');
  await press(button(view, 'Network'));
  await press(radio(view, 'VRSCTEST · Testnet'));
  expect(referralField(view).props.value).toBe('friend@');
  await enterName(view);
  await press(button(view, 'Review costs'));
  expect(mockApi.prepareCommitment.mock.calls[0][0].request).toMatchObject({systemId: 'test-chain', referralID: 'friend@'});
});

it('ignores referral amounts returned for a previously selected network', async () => {
  let finishMainnet;
  mockGetRegistrationReferralInfo
    .mockReturnValueOnce(new Promise(resolve => {finishMainnet = resolve;}))
    .mockResolvedValue({
      discount: '500000000', reward: '250000000', currencyID: 'other-chain', currencyName: 'CHAIN', enabled: true,
    });
  mockState.authentication.activeAccount.keys.CHAIN = {vrpc: {addresses: ['chain-wallet']}};
  mockState.coins.activeCoinsForUser.push({id: 'CHAIN', system_id: 'other-chain', currency_id: 'other-chain', display_ticker: 'CHAIN'});
  const view = await mount(IdentityRegistrationCreate);
  await press(button(view, 'Network'));
  await press(radio(view, 'CHAIN'));

  expect(textContent(view.root)).toContain('makes your ID 5 CHAIN cheaper and gives the referrer 2.5 CHAIN');
  await act(async () => finishMainnet({
    discount: '2000000000', reward: '2000000000', currencyID: 'chain', currencyName: 'VRSC', enabled: true,
  }));
  expect(textContent(view.root)).toContain('makes your ID 5 CHAIN cheaper and gives the referrer 2.5 CHAIN');
  expect(textContent(view.root)).not.toContain('20 VRSC');
});

it('uses the selected network wallet’s private address when creating an identity', async () => {
  mockState.authentication.activeAccount.keys.VRSC.dlight_private = {addresses: ['zsOtherNetwork']};
  mockState.authentication.activeAccount.keys.VRSCTEST = {
    vrpc: {addresses: ['test-wallet']}, dlight_private: {addresses: [PRIVATE_ADDRESS]},
  };
  mockState.coins.activeCoinsForUser.push({
    id: 'VRSCTEST', system_id: 'test-chain', currency_id: 'test-chain', display_ticker: 'VRSCTEST', testnet: true,
  });
  const view = await mount(IdentityRegistrationCreate, {route: {params: {coinId: 'VRSCTEST'}}});
  await enterName(view);
  expect(textContent(view.root)).toContain('Your identity will use this wallet’s private address');
  await press(button(view, 'Review costs'));
  expect(mockApi.prepareCommitment.mock.calls[0][0].request).toMatchObject({
    systemId: 'test-chain', rootSystemName: 'VRSCTEST', signingAddress: 'test-wallet', privateAddress: PRIVATE_ADDRESS,
  });
});

it('includes the private receiving address in the identity review', async () => {
  setSavedReview({...review, identity: {...review.identity, privateaddress: PRIVATE_ADDRESS}});
  const view = await mount(IdentityCommitmentReview);
  await press(view.root.findAllByType(TextAction).find(node => node.props.children === 'Transaction details'));
  expect(textContent(view.root)).toContain('Private address');
  expect(textContent(view.root)).toContain(PRIVATE_ADDRESS);
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

it('links a confirmed identity in one tap and returns after linking', async () => {
  jest.useFakeTimers();
  const registered = {...review, status: 'registered', linked: false, commitmentHeight: 10, registrationTxid: 'registration-txid'};
  setSavedReview(registered);
  const reset = jest.fn();
  const navigation = makeNavigation({getParent: () => ({goBack: jest.fn(), reset})});
  const view = await mount(IdentityRegistrationProgress, {navigation});
  const appButton = label => view.root.findAllByType(AppButton).find(node => node.props.children === label);
  expect(mockApi.linkRegisteredIdentity).not.toHaveBeenCalled();
  expect(textContent(view.root)).toContain('VerusID created');
  expect(appButton('Not now')).toBeDefined();
  expect(view.root.findAllByType(SlideToConfirm)).toHaveLength(0);
  await press(appButton('Link VerusID'));
  expect(mockApi.linkRegisteredIdentity).toHaveBeenCalledTimes(1);
  expect(mockApi.linkRegisteredIdentity).toHaveBeenCalledWith('job', expect.any(Object));
  expect(mockApi.approveRegistration).not.toHaveBeenCalled();
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(mockAlert).not.toHaveBeenCalled();
  expect(textContent(view.root)).toContain('alice@ is linked');
  await press(appButton('Done'));
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(reset).toHaveBeenCalledTimes(1);
});

it('stops passive polling after registration is ready to link and links once during repeated taps', async () => {
  jest.useFakeTimers();
  setSavedReview({...review, status: 'registered', linked: false});
  const reset = jest.fn();
  const navigation = makeNavigation({getParent: () => ({goBack: jest.fn(), reset})});
  let finishLinking;
  mockApi.linkRegisteredIdentity.mockReturnValueOnce(new Promise(resolve => { finishLinking = resolve; }));
  const view = await mount(IdentityRegistrationProgress, {navigation});
  const initialChecks = mockApi.reconcileRegistration.mock.calls.length;
  const linkButton = () => view.root.findAllByType(AppButton).find(node => node.props.children === 'Link VerusID');
  const link = linkButton().props.onPress;
  await act(async () => { link(); link(); });
  expect(mockApi.linkRegisteredIdentity).toHaveBeenCalledTimes(1);
  expect(linkButton().props.disabled).toBe(true);
  expect(reset).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(20000));
  expect(mockApi.reconcileRegistration).toHaveBeenCalledTimes(initialChecks);
  await act(async () => finishLinking({...review, status: 'complete', linked: true}));
  expect(mockApi.linkRegisteredIdentity).toHaveBeenCalledTimes(1);
  expect(mockAlert).not.toHaveBeenCalled();
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
  mockState.channelStore_verusid.watchedVerusIds = {VRSCTEST: {'test-id': 't1.VRSCTEST@'}, VRSC: {'main-id': 'main@'}};
  mockState.ledger = {balances: {'vrpc.test-id.test-chain': {VRSCTEST: {confirmed: '1000'}}}};
  const view = await mount(IdentityRegistrationCreate);
  await press(button(view, 'Pay from'));
  expect(radio(view, 't1.VRSCTEST@')).toBeDefined();
  expect(radio(view, 'main@')).toBeUndefined();
  expect(textContent(view.root)).toContain('1000 VRSCTEST confirmed');
  expect(radio(view, 't1.VRSCTEST@').props.accessibilityState.selected).toBe(true);
  await press(radio(view, 't1.VRSCTEST@'));
  await enterName(view);
  await press(button(view, 'Review costs'));
  expect(mockApi.prepareCommitment).toHaveBeenCalledWith({
    request: expect.objectContaining({systemId: 'test-chain', fundingAddress: 'test-id', signingAddress: 'test-wallet', fundingName: 't1.VRSCTEST@', rootSystemName: 'VRSCTEST'}),
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
  };
  const navigation = {navigate: jest.fn(), replace: jest.fn()};
  const view = await mount(IdentityRegistrationStart, {navigation, route: {params: {coinId: 'VRSCTEST'}}});
  const text = textContent(view.root);
  expect(text).toContain('NEEDS YOU');
  expect(text).toContain('IN PROGRESS');
  expect(text.indexOf('ready@')).toBeLessThan(text.indexOf('pending@'));
  expect(text).not.toContain('finished@');
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

// Delete is in the About this registration sheet. Each sheet closes before the next action runs.
const openDelete = async view => {
  await press(view.root.findAll(node => node.props.accessibilityLabel === 'About this registration' && node.props.onPress)[0]);
  await press(view.root.findAllByType(TextAction).find(node => node.props.children === 'Delete registration'));
  await act(async () => { jest.advanceTimersByTime(1000); });
};
const confirmDelete = async view => {
  await press(view.root.findAllByType(AppButton).find(node => node.props.children === 'Delete'));
  await act(async () => { jest.advanceTimersByTime(1000); });
};

it('warns that the original paid commitment fee is lost forever before deleting progress', async () => {
  jest.useFakeTimers();
  const goBack = jest.fn();
  const navigation = makeNavigation({getParent: () => ({goBack, reset: jest.fn()})});
  const paid = {...review, status: 'commitment_confirmed', deletionKind: 'commitment', commitmentFee: '20000', chainTicker: 'VRSC'};
  setSavedReview(paid);
  mockApi.prepareRegistration.mockResolvedValue({...paid, status: 'registration_prepared'});
  const view = await mount(IdentityRegistrationProgress, {navigation});
  await openDelete(view);
  expect(mockApi.deleteRegistration).not.toHaveBeenCalled();
  const message = view.root.findByType(AcknowledgeSheet).props.message;
  expect(message).toContain('0.0002 VRSC commitment fee is lost');
  expect(message).toContain('cannot finish this registration');
  expect(message).not.toContain('0.0001');
  await confirmDelete(view);
  expect(mockApi.deleteRegistration).toHaveBeenCalledWith('job', 'commitment', expect.any(Object));
  expect(goBack).toHaveBeenCalledTimes(1);
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
  jest.useFakeTimers();
  setSavedReview({...review, status: 'registration_broadcast', deletionKind: null});
  const progress = await mount(IdentityRegistrationProgress);
  await press(progress.root.findAll(node => node.props.accessibilityLabel === 'About this registration' && node.props.onPress)[0]);
  expect(progress.root.findAllByType(TextAction).filter(node => node.props.children === 'Delete registration')).toHaveLength(0);
  expect(mockApi.deleteRegistration).not.toHaveBeenCalled();
});

it('passes the deletion kind the user confirmed and keeps a changed registration when deletion is rejected', async () => {
  jest.useFakeTimers();
  const goBack = jest.fn();
  const navigation = makeNavigation({getParent: () => ({goBack, reset: jest.fn()})});
  setSavedReview({...review, status: 'commitment_prepared', deletionKind: 'draft'});
  mockApi.deleteRegistration.mockRejectedValueOnce(new Error('Registration changed. Review its updated status before deleting.'));
  const view = await mount(IdentityRegistrationProgress, {navigation});
  await openDelete(view);
  await confirmDelete(view);
  expect(mockApi.deleteRegistration).toHaveBeenCalledWith('job', 'draft', expect.any(Object));
  expect(goBack).not.toHaveBeenCalled();
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
  mockApi.approveCommitment.mockRejectedValueOnce(Object.assign(new Error('Registration costs changed. Review the updated amounts.'), {code: 'REVIEW_CHANGED'}));
  const navigation = makeNavigation();
  const view = await mount(IdentityCommitmentReview, {navigation});
  await act(async () => footerAction(view, 'Slide to start').props.onPress());
  // The screen reads the changed review at once; it does not move on or pay again.
  expect(mockApi.getRegistrationReview).toHaveBeenCalledTimes(2);
  expect(mockApi.approveCommitment).toHaveBeenCalledTimes(1);
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(footerAction(view, 'Slide to start').props.disabled).toBe(false);
});

it('a failed saved-review load offers a retry without leaving the screen', async () => {
  mockApi.getRegistrationReview.mockRejectedValueOnce(Object.assign(new Error('Network Error'), {code: 'ERR_NETWORK'}));
  const view = await mount(IdentityCommitmentReview);
  expect(footerAction(view, 'Slide to start').props.disabled).toBe(true);
  await press(view.root.findAllByType(TextAction).find(node => node.props.children === 'Try again'));
  expect(mockApi.getRegistrationReview).toHaveBeenCalledTimes(2);
  expect(footerAction(view, 'Slide to start').props.disabled).toBe(false);
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
});
