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
const mockCreateAlert = jest.fn();
const mockScrollTo = jest.fn();
const mockPublishRegistrationJobs = jest.fn();
const mockClearRegistrationJobs = jest.fn();
const mockUpdateRegistrationUiState = jest.fn();
const mockReadRegistrationBalances = jest.fn();
const mockCheckRegistrationFunds = jest.fn();
const mockReadRegistrationName = jest.fn();
const mockGetRegistrationReferralInfo = jest.fn();
const mockRegistrationReferralNamespace = jest.fn();
const mockLoadRegistrationNamespaces = jest.fn();
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
jest.mock('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/registrationReads', () => ({
  ...jest.requireActual('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/registrationReads'),
  readRegistrationName: (...args) => mockReadRegistrationName(...args),
}));
// The redesign confirms through the app alert sheet; createAlert takes the
// same title, message, buttons and options as the native alert.
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({
  createAlert: (...args) => mockCreateAlert(...args), resolveAlert: jest.fn(),
}));
// The namespace list reads currency definitions from the chain.
jest.mock('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/namespaceData', () => ({
  ...jest.requireActual('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/namespaceData'),
  loadRegistrationNamespaces: (...args) => mockLoadRegistrationNamespaces(...args),
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
const {RegistrationSummary} = require('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/RegistrationFlowComponents');
const SlideToConfirm = require('../../../components/SlideToConfirm').default;
const ProgressHeader = require('../../../components/ProgressHeader').default;
const RegistrationTabRows = require('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/RegistrationTabRows').default;
const TextAction = require('../../../components/TextAction').default;
const AcknowledgeSheet = require('../../../components/AcknowledgeSheet').default;
const EmptyState = require('../../../components/EmptyState').default;
const {default: RegistrationStorageNotice, useRegistrationStorage} =
  require('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/RegistrationStorageNotice');
// The VerusID tab's registration area, as SignedInVerusIdService composes it:
// the storage notice in place of the empty state, then the saved rows.
const RegistrationTab = ({navigation}) => {
  const storage = useRegistrationStorage();
  return <>
    <RegistrationStorageNotice storage={storage}>
      <EmptyState title="No VerusID yet" actionLabel="Add VerusID" onAction={jest.fn()} />
    </RegistrationStorageNotice>
    <RegistrationTabRows jobs={mockState.channelStore_verusid.registrationJobs} navigation={navigation} onLink={jest.fn()} />
  </>;
};
// The tab offers a new VerusID from its empty state only when storage is readable.
const offersNewVerusId = view => textContent(view.root).includes('No VerusID yet');
// A tab action is an AppButton (Try again) or a TextAction (Clear all registration data).
// The reset confirmations shown through the app alert sheet.
const resetAlerts = () => mockCreateAlert.mock.calls.filter(([title]) => title === 'Clear all registration data?');
const tabAction = (view, label) => view.root.findAll(node =>
  [AppButton, TextAction].includes(node.type) && node.props.children === label)[0];
const {preferredRegistrationFundingSource, registrationFundingSources} = require('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/fundingSources');
const quote = {
  branch: 'native', systemID: 'chain', parentID: 'chain', issuerID: 'chain', commitmentFee: '10000',
  registrationOffer: '100000000', nativeFee: '0', importFee: '0', transferFee: '0', referralPayments: [],
  totalOperationRequired: {chain: '100010000'}, totalRequired: {chain: '100000000'},
};
const review = {
  jobId: 'job', revision: 4, approvalToken: 'review-token', status: 'commitment_prepared', displayName: 'alice@', chainTicker: 'VRSC',
  quote, systemId: 'chain', currencyNames: {chain: 'VRSC'}, identityAddress: 'identity',
  identity: {primaryaddresses: ['wallet'], recoveryauthority: 'identity', revocationauthority: 'identity'}, fundingName: 'Wallet address',
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
const nameInput = view => view.root.findAll(node => node.props.accessibilityLabel === 'VerusID name' && node.props.onChangeText)[0];
const typeName = async (view, name = 'alice') => {
  await act(async () => nameInput(view).props.onChangeText(name));
  // The name check waits for typing to pause, then reads availability and the quote.
  await act(async () => { jest.advanceTimersByTime(700); });
};
const advance = async ms => act(async () => { jest.advanceTimersByTime(ms); });
const quoteFor = systemId => ({
  ...quote, systemID: systemId, parentID: systemId, issuerID: systemId,
  totalOperationRequired: {[systemId]: '100010000'}, totalRequired: {[systemId]: '100000000'},
});
const nameReadFor = (request, extra = {}) => ({
  request: {name: request.name}, policy: {resolvedName: {identityID: 'identity', parent: request.systemId}},
  quote: quoteFor(request.systemId), referralQuote: null, referralsAllowed: false, referralRequired: false,
  currencyNames: {[request.systemId]: request.rootSystemName}, ...extra,
});
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
  mockReadRegistrationBalances.mockReset().mockImplementation(async coin => ({status: 'ready', amounts: {[coin.system_id]: '10'}}));
  mockCheckRegistrationFunds.mockReset().mockResolvedValue({status: 'enough'});
  mockApi.getRegistrationEstimate.mockReset().mockResolvedValue({...review, status: 'commitment_confirmed'});
  setSavedReview({...review});
  mockApi.reconcileRegistration.mockResolvedValue({...review});
  mockApi.approveCommitment.mockResolvedValue({...review, status: 'commitment_broadcast'});
  mockApi.approveRegistration.mockResolvedValue({...review, status: 'registration_broadcast'});
  mockApi.prepareRegistration.mockResolvedValue({...review, status: 'registration_prepared'});
  mockApi.refreshRegistrationReview.mockResolvedValue({...review});
  mockApi.prepareCommitment.mockResolvedValue({...review});
  mockApi.findExistingRegistration.mockResolvedValue(null);
  mockReadRegistrationName.mockReset().mockImplementation(async request => nameReadFor(request));
  mockApi.resolveRegistration.mockReset().mockImplementation(async request => ({
    quote: quoteFor(request.systemId), currencyNames: {[request.systemId]: request.rootSystemName}, identityNames: {},
    request: {fundingAddress: request.fundingAddress, signingAddress: request.signingAddress, referralID: request.referralID,
      privateAddress: request.privateAddress},
    policy: {resolvedName: {identityID: 'identity'}},
  }));
  mockApi.deleteRegistration.mockResolvedValue(undefined);
  mockApi.linkRegisteredIdentity.mockResolvedValue({...review, status: 'complete', linked: true});
});
afterEach(() => {
  act(() => views.forEach(view => view.unmount()));
  jest.useRealTimers();
});

it.each([
  ['create form', IdentityRegistrationCreate, 'Continue'],
])('keeps the %s primary action available outside the scrolling content', async (_, Component, label) => {
  jest.useFakeTimers();
  const view = await mount(Component);
  const action = footerAction(view, label);
  expect(action.props.disabled).toBe(true);
  await typeName(view);
  expect(footerAction(view, label).props.disabled).toBe(false);
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

it.each([new Error('Unsupported receipt with protected transaction bytes'), null])('shows a retryable load error on the VerusID tab without exposing receipt details or offering a fresh registration (%p)', async failure => {
  mockPublishRegistrationJobs.mockRejectedValueOnce(failure);
  const view = await mount(RegistrationTab);

  expect(textContent(view.root)).toContain('Saved registrations could not be loaded. Your registration data has not been changed.');
  expect(textContent(view.root)).not.toContain('protected transaction bytes');
  expect(offersNewVerusId(view)).toBe(false);
  expect(view.root.findAllByProps({accessibilityRole: 'alert'})).toHaveLength(1);

  await press(tabAction(view, 'Try again'));

  expect(mockPublishRegistrationJobs).toHaveBeenCalledTimes(2);
  expect(view.root.findAllByProps({accessibilityRole: 'alert'})).toHaveLength(0);
  expect(offersNewVerusId(view)).toBe(true);
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
  const view = await mount(RegistrationTab);

  expect(view.root.findAllByProps({accessibilityRole: 'alert'})).toHaveLength(0);
  expect(tabAction(view, 'Clear all registration data')).toBeUndefined();
});

it('only offers the registration reset after a failed summary load', async () => {
  const view = await mount(RegistrationTab);

  expect(tabAction(view, 'Clear all registration data')).toBeUndefined();
  expect(mockClearRegistrationJobs).not.toHaveBeenCalled();
});

// The app alert runs its "Not now" button for Not now, an outside tap and Android Back.
it.each(['cancel', 'dismiss'])('keeps registration data when the reset confirmation is closed with %s', async choice => {
  mockPublishRegistrationJobs.mockRejectedValueOnce(new Error('Unsupported registration storage'));
  const view = await mount(RegistrationTab);

  await press(tabAction(view, 'Clear all registration data'));
  await press(tabAction(view, 'Clear all registration data'));

  expect(resetAlerts()).toHaveLength(1);
  const [title, message, actions, options] = resetAlerts()[0];
  expect(title).toBe('Clear all registration data?');
  expect(message).toContain('Saved registrations in this wallet are deleted');
  expect(message).toContain('fees already paid will not be refunded');
  expect(message).toContain('This cannot be undone');
  expect(actions.find(action => action.text === 'Clear all registration data').style).toBe('destructive');
  expect(options.cancelable).toBe(true);
  expect(mockClearRegistrationJobs).not.toHaveBeenCalled();

  const wayOut = actions.find(action => action.style === 'cancel');
  expect(wayOut.text).toBe('Not now');
  // Not now, an outside tap and Android Back all run this way out.
  await act(async () => wayOut.onPress());

  expect(mockClearRegistrationJobs).not.toHaveBeenCalled();
  expect(tabAction(view, 'Try again')).toBeDefined();
  await press(tabAction(view, 'Clear all registration data'));
  expect(resetAlerts()).toHaveLength(2);
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
  const view = await mount(RegistrationTab);
  await press(tabAction(view, 'Clear all registration data'));
  expect(mockClearRegistrationJobs).not.toHaveBeenCalled();
  const confirm = resetAlerts()[0][2].find(action => action.style === 'destructive').onPress;
  let saving;

  await act(async () => { saving = confirm(); });
  await act(async () => confirm());

  expect(mockClearRegistrationJobs).toHaveBeenCalledTimes(1);
  expect(mockClearRegistrationJobs).toHaveBeenCalledWith({sessionScope: {accountHash: 'account', sessionEpoch: 1}});
  expect(offersNewVerusId(view)).toBe(false);

  await act(async () => { finishClear(); await saving; });

  expect(view.root.findAllByProps({accessibilityRole: 'alert'})).toHaveLength(0);
  expect(offersNewVerusId(view)).toBe(true);
  expect(textContent(view.root)).not.toContain('saved@');
  expect(tabAction(view, 'Clear all registration data')).toBeUndefined();
  expect(mockApi.prepareCommitment).not.toHaveBeenCalled();
  expect(mockApi.deleteRegistration).not.toHaveBeenCalled();
});

it('keeps the recovery controls and saved rows when clearing registration data fails', async () => {
  mockState.channelStore_verusid.registrationJobs.saved = {
    id: 'saved', displayName: 'saved@', status: 'commitment_broadcast', createdAt: 1,
  };
  mockPublishRegistrationJobs.mockRejectedValueOnce(new Error('Unsupported registration storage'));
  mockClearRegistrationJobs.mockRejectedValueOnce(new Error('Unable to save registration reset.'));
  const view = await mount(RegistrationTab);
  await press(tabAction(view, 'Clear all registration data'));
  await act(async () => resetAlerts()[0][2].find(action => action.style === 'destructive').onPress());

  expect(textContent(view.root)).toContain('Unable to save registration reset.');
  expect(textContent(view.root)).toContain('saved@');
  expect(offersNewVerusId(view)).toBe(false);
  expect(tabAction(view, 'Try again')).toBeDefined();
  expect(tabAction(view, 'Clear all registration data')).toBeDefined();
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
  // Each action is enabled: ActionButton passes `disabled || busy`, so an
  // enabled button can carry false or undefined.
  expect(footerAction(view, label).props.disabled).toBeFalsy();
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
  jest.useFakeTimers();
  mockApi.prepareCommitment.mockResolvedValue({...review});
  mockApi.approveCommitment.mockResolvedValue({...review, status: 'commitment_broadcast'});
  const navigation = makeNavigation();
  const view = await mount(IdentityRegistrationCreate, {navigation});
  await typeName(view);
  await press(footerAction(view, 'Continue'));
  await advance(700);
  // The Check details step shows both stages, then one slide saves and pays the first.
  expect(textContent(view.root)).toContain('Commitment');
  expect(textContent(view.root)).toContain('Registration');
  expect(textContent(view.root)).toContain('1.0001 VRSC');
  await act(async () => footerAction(view, 'Slide to start').props.onPress());
  expect(mockApi.prepareCommitment).toHaveBeenCalledWith({
    request: expect.objectContaining({name: 'alice', systemId: 'chain', fundingAddress: 'wallet', signingAddress: 'wallet', rootSystemName: 'VRSC'}),
  }, expect.any(Object));
  expect(mockApi.approveCommitment).toHaveBeenCalledTimes(1);
  expect(mockApi.approveCommitment).toHaveBeenCalledWith('job', 'review-token', expect.any(Object));
  expect(navigation.replace).toHaveBeenCalledWith('IdentityRegistrationProgress', {jobId: 'job'});
  expect(mockApi.prepareCommitment.mock.calls[0][0].request.privateAddress).toBeUndefined();
});

const referralName = (request, systemId) => nameReadFor(request, {referralsAllowed: true, referralQuote: {
  ...quoteFor(systemId), totalRequired: {[systemId]: '80000000'}, totalOperationRequired: {[systemId]: '80010000'},
}});
const radioRows = view => view.root.findAll(node => node.props.accessibilityRole === 'radio' && node.props.onPress);
const goToCheck = async view => {
  await press(footerAction(view, 'Continue'));
  await advance(700);
};

it.each([
  ['VRSC', 'chain', false],
  ['VRSCTEST', 'test-chain', true],
])('defaults %s referrals to the foundation and submits the displayed value', async (id, systemId, testnet) => {
  jest.useFakeTimers();
  mockState.authentication.activeAccount.keys[id] = {vrpc: {addresses: ['wallet']}};
  mockState.coins.activeCoinsForUser = [{id, system_id: systemId, currency_id: systemId, display_ticker: id, testnet}];
  mockReadRegistrationName.mockImplementation(async request => referralName(request, systemId));
  mockApi.prepareCommitment.mockResolvedValue({...review});
  const view = await mount(IdentityRegistrationCreate);
  await typeName(view);
  await goToCheck(view);
  // The Referral step selects the foundation; the Check details step then shows it.
  expect(textContent(view.root)).toContain('Verus Coin Foundation@');
  await goToCheck(view);
  await act(async () => footerAction(view, 'Slide to start').props.onPress());
  expect(mockApi.prepareCommitment.mock.calls[0][0].request.referralID).toBe('Verus Coin Foundation@');
});

it('lets a cleared referral stay empty through name edits and submission, and restores it with the foundation button', async () => {
  jest.useFakeTimers();
  mockReadRegistrationName.mockImplementation(async request => referralName(request, 'chain'));
  mockApi.prepareCommitment.mockResolvedValue({...review});
  const view = await mount(IdentityRegistrationCreate);
  const row = title => radioRows(view).find(node => textContent(node).startsWith(title));
  await typeName(view);
  await goToCheck(view);
  expect(row('Verus Coin Foundation@').props.selected).toBe(true);
  await press(row('No referral'));
  // Back to the name step: editing the name keeps the cleared choice.
  await act(async () => view.root.findByType(ProgressHeader).props.onBack());
  await typeName(view, 'alice2');
  await goToCheck(view);
  expect(row('No referral').props.selected).toBe(true);
  await goToCheck(view);
  await act(async () => footerAction(view, 'Slide to start').props.onPress());
  expect(mockApi.prepareCommitment.mock.calls[0][0].request).not.toHaveProperty('referralID');

  await act(async () => view.root.findByType(ProgressHeader).props.onBack());
  await press(row('Verus Coin Foundation@'));
  expect(row('Verus Coin Foundation@').props.selected).toBe(true);
  await goToCheck(view);
  await act(async () => footerAction(view, 'Slide to start').props.onPress());
  expect(mockApi.prepareCommitment.mock.calls[1][0].request.referralID).toBe('Verus Coin Foundation@');
});

it.each([false, true])('keeps the referral explanation on another chain without a foundation default or button (testnet=%s)', async testnet => {
  jest.useFakeTimers();
  mockState.authentication.activeAccount.keys.CHAIN = {vrpc: {addresses: ['chain-wallet']}};
  mockState.coins.activeCoinsForUser = [{
    id: 'CHAIN', system_id: 'other-chain', currency_id: 'other-chain', display_ticker: 'CHAIN', testnet,
  }];
  mockReadRegistrationName.mockImplementation(async request => referralName(request, 'other-chain'));
  const view = await mount(IdentityRegistrationCreate);
  await typeName(view);
  await goToCheck(view);
  const titles = radioRows(view).map(textContent);
  expect(titles.some(label => label.startsWith('Verus Coin Foundation@'))).toBe(false);
  expect(titles.some(label => label.startsWith('Someone else'))).toBe(true);
  expect(titles.some(label => label.startsWith('No referral'))).toBe(true);
  expect(textContent(view.root)).toContain('A referral lowers the price.');
  expect(mockReadRegistrationName).toHaveBeenLastCalledWith(expect.objectContaining({
    systemId: 'other-chain', rootSystemName: testnet ? 'VRSCTEST' : 'VRSC',
  }), expect.any(Object));
});

// The referral savings now show as the price on each referral row. A new
// namespace is chosen in the namespace sheet; it reads the name again with
// that namespace, and the rows show the new namespace's referral price.
it('refreshes referral savings when the identity namespace changes', async () => {
  jest.useFakeTimers();
  const community = {
    id: 'community-id', name: 'community', parentName: 'community@', suffix: '.community@',
    amount: '100000000', currency: 'community', referralsAllowed: true, referralRequired: false,
  };
  mockLoadRegistrationNamespaces.mockResolvedValue([community]);
  mockReadRegistrationName.mockImplementation(async request => request.parent === 'community-id'
    ? nameReadFor(request, {referralsAllowed: true, referralQuote: {
      ...quoteFor('chain'), parentID: 'community-id', issuerID: 'community-id', feePricingCurrencyID: 'chain',
      totalRequired: {chain: '97500000'}, totalOperationRequired: {chain: '97510000'},
    }})
    : referralName(request, 'chain'));
  const view = await mount(IdentityRegistrationCreate);
  const row = title => radioRows(view).find(node => textContent(node).startsWith(title));
  await typeName(view);
  await goToCheck(view);
  expect(textContent(row('Verus Coin Foundation@'))).toContain('0.8001');

  await act(async () => view.root.findByType(ProgressHeader).props.onBack());
  await press(view.root.findAll(node => node.props.accessibilityLabel === 'Choose a namespace: Verus' && node.props.onPress)[0]);
  const namespaceRow = view.root.findAll(node => node.props.title === 'community' && node.props.onPress)[0];
  await press(namespaceRow);
  // The choice applies once the sheet has closed.
  await act(async () => view.root.findAll(node => node.props.title === 'Choose a namespace' && node.props.onClosed)[0].props.onClosed());
  await advance(700);
  expect(mockReadRegistrationName).toHaveBeenLastCalledWith(expect.objectContaining({
    name: 'alice', systemId: 'chain', rootSystemName: 'VRSC', parent: 'community-id', parentName: 'community@',
  }), expect.any(Object));

  await goToCheck(view);
  // The explanation names the chosen namespace instead of the root.
  expect(textContent(view.root)).toMatch(/A community@? referral lowers the price\./);
  expect(row('Verus Coin Foundation@')).toBeUndefined();
  expect(textContent(row('Someone else'))).toContain('0.9751');
  expect(textContent(row('Someone else'))).not.toContain('0.8001');
});

it('explains when a namespace has no referral discount or reward', async () => {
  jest.useFakeTimers();
  // The name read says this namespace takes no referrals, so the flow has no Referral step.
  mockReadRegistrationName.mockImplementation(async request => nameReadFor(request, {referralsAllowed: false}));
  const view = await mount(IdentityRegistrationCreate);
  await typeName(view);
  await goToCheck(view);
  expect(radioRows(view)).toHaveLength(0);
  expect(textContent(view.root)).not.toContain('A referral lowers the price.');
  expect(footerAction(view, 'Slide to start')).toBeDefined();
});

it('ignores referral amounts returned for a previously selected network', async () => {
  jest.useFakeTimers();
  mockState.authentication.activeAccount.keys.CHAIN = {vrpc: {addresses: ['chain-wallet']}};
  mockState.coins.activeCoinsForUser.push({id: 'CHAIN', system_id: 'other-chain', currency_id: 'other-chain', display_ticker: 'CHAIN'});
  const priced = (systemId, label, atomic) => ({
    quote: {...quoteFor(systemId), totalRequired: {[systemId]: atomic}, totalOperationRequired: {[systemId]: String(Number(atomic) + 10000)}},
    currencyNames: {[systemId]: label},
  });
  let finishMainnet;
  mockReadRegistrationName
    .mockImplementationOnce(request => new Promise(resolve => {
      finishMainnet = () => resolve(nameReadFor(request, priced('chain', 'VRSC', '2000000000')));
    }))
    .mockImplementation(async request => nameReadFor(request, priced('other-chain', 'CHAIN', '500000000')));
  const view = await mount(IdentityRegistrationCreate);
  await typeName(view);
  await press(view.root.findAll(node => node.props.accessibilityLabel === 'Network: VRSC' && node.props.onPress)[0]);
  await press(view.root.findAll(node => node.props.accessibilityRole === 'radio' && node.props.accessibilityLabel === 'CHAIN' && node.props.onPress)[0]);
  await advance(500);
  await advance(700);
  expect(textContent(view.root)).toContain('5.0001 CHAIN');
  await act(async () => finishMainnet());
  expect(textContent(view.root)).toContain('5.0001 CHAIN');
  expect(textContent(view.root)).not.toContain('20.0001 VRSC');
});

it('uses the selected network wallet’s private address when creating an identity', async () => {
  jest.useFakeTimers();
  mockState.authentication.activeAccount.keys.VRSC.dlight_private = {addresses: ['zsOtherNetwork']};
  mockState.authentication.activeAccount.keys.VRSCTEST = {
    vrpc: {addresses: ['test-wallet']}, dlight_private: {addresses: [PRIVATE_ADDRESS]},
  };
  mockState.coins.activeCoinsForUser.push({
    id: 'VRSCTEST', system_id: 'test-chain', currency_id: 'test-chain', display_ticker: 'VRSCTEST', testnet: true,
  });
  mockApi.prepareCommitment.mockResolvedValue({...review});
  const view = await mount(IdentityRegistrationCreate, {route: {params: {coinId: 'VRSCTEST'}}});
  await typeName(view);
  await goToCheck(view);
  await act(async () => footerAction(view, 'Slide to start').props.onPress());
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
  jest.useFakeTimers();
  let finishPreparation;
  mockApi.prepareCommitment.mockReturnValue(new Promise(resolve => {finishPreparation = resolve;}));
  const navigation = makeNavigation();
  const view = await mount(IdentityRegistrationCreate, {navigation});
  await typeName(view);
  await goToCheck(view);
  const slidePress = footerAction(view, 'Slide to start').props.onPress;
  await act(async () => {slidePress();});
  expect(mockApi.prepareCommitment).toHaveBeenCalledTimes(1);
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(footerAction(view, 'Slide to start').props).toMatchObject({disabled: true, loading: true});
  await act(async () => {slidePress();});
  expect(mockApi.prepareCommitment).toHaveBeenCalledTimes(1);
  await act(async () => finishPreparation({...review}));
  expect(navigation.replace).toHaveBeenCalledTimes(1);
  expect(navigation.replace).toHaveBeenCalledWith('IdentityRegistrationProgress', {jobId: 'job'});
  expect(mockApi.approveCommitment).toHaveBeenCalledTimes(1);
});

it.each([
  ['commitment_prepared', 'IdentityCommitmentReview'],
  ['registration_prepared', 'IdentityRegistrationProgress'],
  ['commitment_broadcast', 'IdentityRegistrationProgress'],
  ['registered', 'IdentityRegistrationProgress'],
])('resumes an existing %s registration before quoting or preparing another payment', async (status, screen) => {
  jest.useFakeTimers();
  mockApi.findExistingRegistration.mockResolvedValue({...review, jobId: 'existing', status});
  const navigation = makeNavigation();
  const view = await mount(IdentityRegistrationCreate, {navigation});
  await typeName(view);
  expect(textContent(view.root)).toContain('Saved registration');
  await press(footerAction(view, 'Continue'));
  expect(mockApi.findExistingRegistration).toHaveBeenCalledWith(expect.objectContaining({
    name: 'alice', systemId: 'chain', rootSystemName: 'VRSC',
  }), expect.any(Object));
  expect(navigation.replace).toHaveBeenCalledWith(screen, {jobId: 'existing'});
  expect(mockApi.resolveRegistration).not.toHaveBeenCalled();
  expect(mockReadRegistrationName).not.toHaveBeenCalled();
  expect(mockApi.prepareCommitment).not.toHaveBeenCalled();
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
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
  jest.useFakeTimers();
  mockReadRegistrationBalances.mockResolvedValue({status: 'ready', amounts: {chain: '0.5'}});
  const view = await mount(IdentityRegistrationCreate);
  await typeName(view);
  // The shortfall shows on the Name step, next to the price, before anything is prepared.
  expect(textContent(view.root)).toContain('1.0001 VRSC');
  expect(textContent(view.root)).toContain('You have 0.5 VRSC');
  expect(footerAction(view, 'Continue').props.disabled).toBe(true);
  expect(mockApi.prepareCommitment).not.toHaveBeenCalled();
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
});

it('scrolls each failed attempt to its error and shows only the button spinner while retrying', async () => {
  jest.useFakeTimers();
  const message = 'Insufficient funds for both steps.';
  mockApi.prepareCommitment.mockRejectedValueOnce(new Error(message));
  const view = await mount(IdentityRegistrationCreate);
  await typeName(view);
  await goToCheck(view);
  const footer = () => view.root.findByProps({testID: 'registration-footer'});
  const alerts = () => footer().findAll(node => node.props.accessibilityRole === 'alert' && typeof node.type === 'string');
  expect(alerts()).toHaveLength(0);
  await act(async () => footerAction(view, 'Slide to start').props.onPress());
  // The error shows in the fixed footer, next to the action, so it needs no scrolling.
  expect(alerts()).toHaveLength(1);
  expect(textContent(alerts()[0])).toBe(message);

  let failRetry;
  mockApi.prepareCommitment.mockReturnValueOnce(new Promise((_, reject) => {failRetry = reject;}));
  await act(async () => {footerAction(view, 'Slide to start').props.onPress();});
  expect(alerts()).toHaveLength(0);
  expect(footerAction(view, 'Slide to start').props).toMatchObject({disabled: true, loading: true});

  await act(async () => failRetry(new Error(message)));
  expect(alerts()).toHaveLength(1);
  expect(textContent(alerts()[0])).toBe(message);
  expect(footerAction(view, 'Slide to start').props.loading).toBeFalsy();
});

const openPayers = async view => act(async () => view.root.findByType(RegistrationSummary).props.onPayer());
const payerRows = view => radioRows(view).filter(node => typeof node.props.accessibilityLabel === 'string');

it('uses the friendly selected linked VerusID for payment while keeping the wallet key as controller', async () => {
  jest.useFakeTimers();
  mockState.authentication.activeAccount.keys.VRSCTEST = {vrpc: {addresses: ['test-wallet']}};
  mockState.coins.activeCoinsForUser = [{id: 'VRSCTEST', system_id: 'test-chain', currency_id: 'test-chain', display_ticker: 'VRSCTEST', testnet: true}];
  mockState.channelStore_verusid.watchedVerusIds = {VRSCTEST: {'test-id': 't1.VRSCTEST@'}, VRSC: {'main-id': 'main@'}};
  mockReadRegistrationBalances.mockImplementation(async (coin, source) => ({
    status: 'ready', amounts: {[coin.system_id]: source.address === 'test-id' ? '1000' : '0'},
  }));
  mockApi.prepareCommitment.mockResolvedValue({...review});
  const view = await mount(IdentityRegistrationCreate);
  await typeName(view);
  await goToCheck(view);
  expect(textContent(view.root).replace(/\u200B/g, '')).toContain('Pay fromt1.VRSCTEST@');
  await openPayers(view);
  const labels = payerRows(view).map(node => node.props.accessibilityLabel.replace(/\u200B/g, ''));
  expect(labels.some(label => label.startsWith('t1.VRSCTEST@'))).toBe(true);
  expect(labels.some(label => label.startsWith('main@'))).toBe(false);
  expect(labels.some(label => label.includes('1000 VRSCTEST'))).toBe(true);
  expect(payerRows(view).find(node => node.props.accessibilityLabel.startsWith('t1.')).props.selected).toBe(true);
  await act(async () => footerAction(view, 'Slide to start').props.onPress());
  expect(mockApi.prepareCommitment).toHaveBeenCalledWith({
    request: expect.objectContaining({systemId: 'test-chain', fundingAddress: 'test-id', signingAddress: 'test-wallet', fundingName: 't1.VRSCTEST@', rootSystemName: 'VRSCTEST'}),
  }, expect.any(Object));
});

// The payer is chosen on Check details. The default is the first source
// whose confirmed balance pays the quote (d30ee935); unconfirmed funds do not
// count, and an explicit choice is kept when balances change again.
it('updates the default when confirmed balances arrive while preserving an explicit payment choice', async () => {
  jest.useFakeTimers();
  mockState.channelStore_verusid.watchedVerusIds = {VRSC: {'funded-id': 'funded@', 'other-id': 'other@'}};
  // Live balance reads stay pending, so the confirmed ledger balances decide.
  mockReadRegistrationBalances.mockImplementation(() => new Promise(() => {}));
  mockState.ledger = {rates: {}, balances: {
    'vrpc.wallet.chain': {VRSC: {confirmed: '0.5', unconfirmed: '10000'}},
    'vrpc.other-id.chain': {VRSC: {confirmed: '5'}},
  }};
  mockApi.prepareCommitment.mockResolvedValue({...review});
  const props = {navigation: makeNavigation(), route: {params: {}}};
  const view = await mount(IdentityRegistrationCreate, props);
  await typeName(view);
  await goToCheck(view);
  expect(payerText(view)).toContain('Pay fromother@');

  mockState.ledger.balances = {...mockState.ledger.balances, 'vrpc.funded-id.chain': {VRSC: {confirmed: '1000'}}};
  await act(async () => view.update(<IdentityRegistrationCreate {...props} />));
  await advance(700);
  expect(payerText(view)).toContain('Pay fromfunded@');

  await openPayers(view);
  await press(payerRows(view).find(node => node.props.accessibilityLabel.startsWith('other@')));
  await advance(700);
  mockState.ledger.balances = {...mockState.ledger.balances, 'vrpc.funded-id.chain': {VRSC: {confirmed: '2000'}}};
  await act(async () => view.update(<IdentityRegistrationCreate {...props} />));
  await advance(700);
  expect(payerText(view)).toContain('Pay fromother@');
  await act(async () => footerAction(view, 'Slide to start').props.onPress());
  expect(mockApi.prepareCommitment.mock.calls[0][0].request.fundingAddress).toBe('other-id');
});

const twoNetworks = () => {
  mockState.authentication.activeAccount.keys.VRSCTEST = {vrpc: {addresses: ['test-wallet']}};
  mockState.coins.activeCoinsForUser.push({id: 'VRSCTEST', system_id: 'test-chain', currency_id: 'test-chain', display_ticker: 'VRSCTEST', testnet: true});
  mockState.channelStore_verusid.watchedVerusIds = {VRSC: {'main-id': 'main@'}, VRSCTEST: {'test-id': 'test@'}};
  mockReadRegistrationBalances.mockImplementation(async (coin, source) => ({
    status: 'ready', amounts: {[coin.system_id]: {'main-id': '100', 'test-id': '1000'}[source.address] || '0'},
  }));
};
const switchNetwork = async (view, from, to) => {
  await press(view.root.findAll(node => node.props.accessibilityLabel === `Network: ${from}` && node.props.onPress)[0]);
  await press(view.root.findAll(node => node.props.accessibilityRole === 'radio' && node.props.accessibilityLabel === to && node.props.onPress)[0]);
  await advance(500);
  await advance(700);
};
const payerText = view => textContent(view.root).replace(/\u200B/g, '');

it('chooses the funded source on each network and keeps no payer choice across networks', async () => {
  jest.useFakeTimers();
  twoNetworks();
  const view = await mount(IdentityRegistrationCreate);
  await typeName(view);
  await goToCheck(view);
  expect(payerText(view)).toContain('Pay frommain@');
  await act(async () => view.root.findByType(ProgressHeader).props.onBack());
  await switchNetwork(view, 'VRSC', 'VRSCTEST · Testnet');
  await goToCheck(view);
  expect(payerText(view)).toContain('Pay fromtest@');
  await act(async () => view.root.findByType(ProgressHeader).props.onBack());
  await switchNetwork(view, 'VRSCTEST · Testnet', 'VRSC');
  await goToCheck(view);
  expect(payerText(view)).toContain('Pay frommain@');
});

it('clears the old estimate and funding selection when the network changes', async () => {
  jest.useFakeTimers();
  twoNetworks();
  const view = await mount(IdentityRegistrationCreate);
  await typeName(view);
  await goToCheck(view);
  // An explicit choice of the wallet address on the first network...
  await openPayers(view);
  await press(payerRows(view).find(node => node.props.accessibilityLabel.startsWith('Transparent')) || payerRows(view)[0]);
  await act(async () => { jest.advanceTimersByTime(500); });
  await act(async () => view.root.findByType(ProgressHeader).props.onBack());
  expect(textContent(view.root)).toContain('1.0001 VRSC');
  // ...does not carry to the next network, and the old price is gone until the new one is read.
  await act(async () => {
    view.root.findAll(node => node.props.accessibilityLabel === 'Network: VRSC' && node.props.onPress)[0].props.onPress();
  });
  await press(view.root.findAll(node => node.props.accessibilityRole === 'radio' && node.props.accessibilityLabel === 'VRSCTEST · Testnet' && node.props.onPress)[0]);
  await advance(500);
  expect(textContent(view.root)).not.toContain('1.0001 VRSC');
  await advance(700);
  expect(textContent(view.root)).toContain('1.0001 VRSCTEST');
  await goToCheck(view);
  expect(payerText(view)).toContain('Pay fromtest@');
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

const openDetails = async view => press(view.root.findAllByType(TextAction).find(node => node.props.children === 'Transaction details'));

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
  const summary = textContent(view.root);
  expect(summary).toContain('t1@');
  expect(summary).toContain('recovery@');
  expect(summary).toContain('friend@');
  [ownAddress, fundingAddress, authorityAddress, referralAddress, namespaceAddress].forEach(address => {
    expect(summary).not.toContain(address);
  });
  await openDetails(view);
  const details = textContent(view.root);
  expect(details).toContain('community@');
  expect(details).toContain('Addresses');
  expect(details).toContain(ownAddress);
  expect(details).toContain(fundingAddress);
  expect(details).not.toContain(authorityAddress);
  expect(details).not.toContain(referralAddress);
  expect(details).not.toContain(namespaceAddress);
});

it('shows a changed registration authority by name before renewed approval even when the price is unchanged', async () => {
  const oldAuthority = `i${'A'.repeat(33)}`;
  const newAuthority = `i${'B'.repeat(33)}`;
  const identityNames = {[oldAuthority]: 'first-issuer@', [newAuthority]: 'new-issuer@'};
  mockApi.getRegistrationReview
    .mockResolvedValueOnce({...review, registrationAuthority: oldAuthority, identityNames})
    .mockResolvedValue({...review, registrationAuthority: newAuthority, identityNames, approvalToken: 'new-authority-token'});
  mockApi.approveCommitment.mockRejectedValueOnce(Object.assign(new Error('Registration authority changed.'), {code: 'REVIEW_CHANGED'}));
  const view = await mount(IdentityCommitmentReview);
  await openDetails(view);
  expect(textContent(view.root)).toContain('Registration authorized by');
  expect(textContent(view.root)).toContain('first-issuer@');
  expect(textContent(view.root)).not.toContain(oldAuthority);
  await act(async () => { jest.advanceTimersByTime(0); });
  await act(async () => footerAction(view, 'Slide to start').props.onPress());
  // The changed review is read at once and shown by name; no payment was made with the old token.
  expect(mockApi.approveCommitment).toHaveBeenCalledTimes(1);
  expect(mockApi.approveCommitment).toHaveBeenCalledWith('job', 'review-token', expect.any(Object));
  expect(textContent(view.root)).toContain('new-issuer@');
  expect(textContent(view.root)).not.toContain('first-issuer@');
  expect(textContent(view.root)).not.toContain(newAuthority);
  await act(async () => footerAction(view, 'Slide to start').props.onPress());
  expect(mockApi.approveCommitment).toHaveBeenCalledTimes(2);
  expect(mockApi.approveCommitment).toHaveBeenLastCalledWith('job', 'new-authority-token', expect.any(Object));
});

it('stacks full cost labels and amounts on a narrow screen with large text', async () => {
  const view = await mount(IdentityCommitmentReview);
  const flat = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
  // Each stage row keeps its full label and amount, lets the pair wrap, and scales with the text size.
  [['Commitment', '0.0001'], ['Registration', '1']].forEach(([title, value]) => {
    const row = view.root.findAll(node => node.type === 'View' && flat(node.props.style).flexWrap === 'wrap' &&
      node.findAllByType('Text').some(text => textContent(text) === title)).pop();
    expect(row).toBeDefined();
    const label = row.findAllByType('Text').find(text => textContent(text) === title);
    const amount = row.findAllByType('Text').find(text => textContent(text) === value);
    expect(amount).toBeDefined();
    [label, amount].forEach(text => {
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.allowFontScaling).not.toBe(false);
    });
  });
});

const renderRows = async (jobs, navigation, group) => {
  let view;
  await act(async () => {
    view = create(<RegistrationTabRows jobs={jobs} navigation={navigation} group={group} onLink={jest.fn()} />);
  });
  views.push(view);
  return view;
};
const rowButton = (view, label) => view.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.onPress &&
  String(node.props.accessibilityLabel).startsWith(label))[0];

it('groups saved registrations by next action, hides completed details, and resumes the chosen job', async () => {
  const jobs = {
    waiting: {id: 'waiting', displayName: 'pending@', status: 'commitment_broadcast', createdAt: 1},
    ready: {id: 'ready', displayName: 'ready@', status: 'commitment_confirmed', createdAt: 2},
    completed: {id: 'completed', displayName: 'finished@', status: 'complete', createdAt: 3},
  };
  const navigation = makeNavigation();
  const view = await renderRows(jobs, navigation, 'In progress');
  const text = textContent(view.root);
  expect(text).toContain('In progress');
  expect(text.indexOf('ready@')).toBeLessThan(text.indexOf('pending@'));
  expect(text).not.toContain('finished@');
  await press(rowButton(view, 'ready@'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('IdentityRegistration', {
    screen: 'IdentityRegistrationProgress', params: {jobId: 'ready'},
  });
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(mockApi.approveRegistration).not.toHaveBeenCalled();
});

it.each([
  ['commitment_prepared', 'IdentityCommitmentReview'],
  ['registration_prepared', 'IdentityRegistrationProgress'],
  ['commitment_broadcast', 'IdentityRegistrationProgress'],
])('opens the next saved screen directly for %s without making a payment', async (status, screen) => {
  const navigation = makeNavigation();
  const view = await renderRows({saved: {id: 'saved', displayName: 'saved@', status, createdAt: 1}}, navigation);
  await press(rowButton(view, 'saved@'));
  expect(navigation.navigate).toHaveBeenCalledWith('IdentityRegistration', {screen, params: {jobId: 'saved'}});
  expect(mockApi.approveCommitment).not.toHaveBeenCalled();
  expect(mockApi.approveRegistration).not.toHaveBeenCalled();
});

it('returns from progress to saved registrations without creating or resubmitting a transaction', async () => {
  const goBack = jest.fn();
  const navigation = makeNavigation({getParent: () => ({goBack, reset: jest.fn()})});
  setSavedReview({...review, status: 'commitment_broadcast', commitmentTxid: 'sent'});
  const view = await mount(IdentityRegistrationProgress, {navigation});
  await press(footerAction(view, 'Done for now'));
  expect(goBack).toHaveBeenCalledTimes(1);
  expect(mockApi.retryBroadcast).not.toHaveBeenCalled();
  expect(mockApi.prepareCommitment).not.toHaveBeenCalled();
});

it.each([
  ['draft', 'commitment_prepared', 'No payment has been sent.'],
])('deletes a %s from the home list only after confirmation', async (deletionKind, status, warning) => {
  jest.useFakeTimers();
  const goBack = jest.fn();
  const navigation = makeNavigation({getParent: () => ({goBack, reset: jest.fn()})});
  setSavedReview({...review, status, deletionKind});
  const view = await mount(IdentityRegistrationProgress, {navigation});
  await openDelete(view);
  expect(mockApi.deleteRegistration).not.toHaveBeenCalled();
  expect(view.root.findByType(AcknowledgeSheet).props.message).toContain(warning);
  expect(view.root.findByType(AcknowledgeSheet).props.destructive).toBe(true);
  await press(view.root.findAllByType(AppButton).find(node => node.props.children === 'Keep registration'));
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(mockApi.deleteRegistration).not.toHaveBeenCalled();
  await openDelete(view);
  await confirmDelete(view);
  expect(mockApi.deleteRegistration).toHaveBeenCalledWith('job', deletionKind, expect.any(Object));
  expect(goBack).toHaveBeenCalledTimes(1);
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

// Delete now lives only in the About sheet of the progress screen; saved
// rows in the VerusID tab have no delete action.
it.each(['registration_broadcast', 'registration_signed'])('never offers deletion for an unsettled signed registration (%s)', async status => {
  jest.useFakeTimers();
  setSavedReview({...review, status, deletionKind: null});
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
