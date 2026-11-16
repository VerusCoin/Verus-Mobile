let mockState;
let mockNavigation;
const mockAlert = jest.fn();
const mockClear = jest.fn();
const mockRemove = jest.fn();
jest.mock('react-redux', () => require('../../../tests/helpers/mockReactRedux')({useSelector: selector => selector(mockState)}));
jest.mock('react-native', () => require('../../../tests/helpers/mockReactNative')({
  View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity',
  Alert: {alert: mockAlert}, StyleSheet: {create: value => value, hairlineWidth: 1},
}));
jest.mock('react-native-paper', () => ({...jest.requireActual('react-native-paper'), Card: 'Card', IconButton: 'IconButton'}));
jest.mock('../../../containers/Home/HomeWidgets/VerusIdReadyCard', () => 'VerusIdReadyCard');
jest.mock('@react-navigation/native', () => ({useNavigation: () => mockNavigation, useIsFocused: () => true}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('../../../containers/Services/ServiceComponents/VerusIdService/LinkVerusIdSheet', () => 'LinkVerusIdSheet');
jest.mock('../../../actions/actions/services/dispatchers/verusid/registration', () => ({
  updateRegistrationUiState: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../../images/customIcons', () => ({
  VerusIdAtIcon: 'VerusIdAtIcon', ReceivedIcon: 'ReceivedIcon', VerusIdErrorIcon: 'VerusIdErrorIcon',
}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {getBasicCoinObj: chain => ({id: chain})}}));
jest.mock('../../../actions/actions/notifications/dispatchers/notifications', () => ({
  dispatchClearAccountNotifications: mockClear, dispatchRemoveNotification: mockRemove, dispatchAddNotification: jest.fn(),
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const NotificationWidget = require('../../../containers/Home/HomeWidgets/NotificationWidget').default;
const {registrationNotifications} = require('../../identityRegistration/notifications');
const {NOTIFICATION_TYPE_BASIC, NOTIFICATION_ICON_TX, NOTIFICATION_TYPE_VERUS_ID_PROVISIONING} = require('../../constants/notifications');
const longName = 'a-long-identity-name.in-a-long-namespace.VRSCTEST@';
const textContent = node => typeof node === 'string' ? node :
  (node.children || []).map(textContent).join('');
const AppButton = require('../../../components/AppButton').default;
const actionButton = view => view.root.findAllByType(AppButton)[0];
// The notice is the card that holds the registration's name.
const notice = view => view.root.findAll(node => node.type === 'View' && node.findAllByType('Text')
  .some(label => textContent(label) === longName) && node.findAllByType(AppButton).length > 0).pop();
const render = navigation => {
  mockNavigation = navigation;
  return create(<NotificationWidget />);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockState = {
    authentication: {activeAccount: {accountHash: 'account'}},
    channelStore_verusid: {registrationJobs: {job: {
      id: 'job', accountHash: 'account', displayName: longName,
      identityAddress: 'iTechnicalAddress', commitmentTxid: 'commitment',
      status: 'commitment_broadcast', createdAt: 1,
    }}},
    notifications: {directory: {}},
    settings: {generalWalletSettings: {}},
  };
});

it('keeps status and action separate, announces the full name, and opens progress from the whole notice', () => {
  const navigation = {navigate: jest.fn()};
  let view;
  act(() => {view = render(navigation);});
  const row = notice(view);
  const labels = row.findAllByType('Text');
  expect(labels.map(textContent)).toEqual([
    longName, 'Confirming commitment', 'View progress',
  ]);
  labels.forEach(label => {
    // The name and status show in full (the button label is one line) and scale with the text size.
    if (textContent(label) !== 'View progress') expect(label.props.numberOfLines).toBeUndefined();
    expect(label.props.allowFontScaling).not.toBe(false);
  });
  // The name sits above the status in a column, instead of competing for
  // horizontal space with it.
  expect(labels[0].parent.props.style.flexDirection).not.toBe('row');
  expect(JSON.stringify(view.toJSON())).not.toContain('iTechnicalAddress');
  act(() => actionButton(view).props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('IdentityTab', {
    screen: 'IdentityRegistration',
    params: {originTab: 'WalletHome', screen: 'IdentityRegistrationProgress', params: {jobId: 'job'}},
  });
});

it('changes the same persistent notice into a registration action when the commitment confirms', () => {
  let view;
  act(() => {view = render({navigate: jest.fn()});});
  mockState.channelStore_verusid.registrationJobs.job.status = 'commitment_confirmed';
  act(() => view.update(<NotificationWidget navigation={{navigate: jest.fn()}} />));
  expect(textContent(notice(view))).toContain('Ready for the second payment');
  expect(textContent(notice(view))).toContain('Continue');
  expect(notice(view).findAllByProps({accessibilityLabel: 'Dismiss notification'})).toHaveLength(0);
  expect(registrationNotifications(mockState.channelStore_verusid.registrationJobs, 'account')[0].persistent).toBe(true);
});

it('keeps registration notices after clearing ordinary notifications and supports collapse', () => {
  mockState.notifications.directory.message = {
    uid: 'message', acchash: 'account', type: NOTIFICATION_TYPE_BASIC,
    icon: NOTIFICATION_ICON_TX, title: ['Payment ', 'received'], body: 'A wallet payment',
  };
  mockRemove.mockImplementation(() => {mockState.notifications = {directory: {}};});
  let view;
  act(() => {view = render({navigate: jest.fn()});});
  const dismiss = view.root.findAllByType('TouchableOpacity').find(item => item.props.accessibilityLabel === 'Dismiss notification');
  act(() => dismiss.props.onPress());
  act(() => view.update(<NotificationWidget />));
  expect(notice(view)).toBeDefined();
  expect(mockRemove).toHaveBeenCalledTimes(1);
  expect(mockRemove).toHaveBeenCalledWith('message');
  expect(mockClear).not.toHaveBeenCalled();
  expect(view.root.findAllByType('TouchableOpacity').filter(item => item.props.accessibilityLabel === 'Dismiss notification')).toHaveLength(0);
});

it('keeps a registered identity visible until the user explicitly links it', () => {
  const jobs = mockState.channelStore_verusid.registrationJobs;
  jobs.job.status = 'registered';
  jobs.job.linked = false;
  const notification = registrationNotifications(jobs, 'account')[0];
  expect(notification).toMatchObject({persistent: true, ready: true, body: 'Link VerusID'});
  const navigation = {navigate: jest.fn()};
  let view;
  act(() => {view = render(navigation);});
  const card = view.root.findByType('VerusIdReadyCard');
  expect(card.props).toMatchObject({highlight: longName, remainder: 'is ready', label: 'Link VerusID'});
  expect(view.root.findByType('LinkVerusIdSheet').props.target).toBeNull();
  act(() => card.props.onAction());
  expect(view.root.findByType('LinkVerusIdSheet').props.target).toEqual({jobId: 'job', name: longName});
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(jobs.job.linked).toBe(false);
  jobs.job.status = 'complete';
  jobs.job.linked = true;
  act(() => view.update(<NotificationWidget />));
  expect(view.root.findAllByType('VerusIdReadyCard')).toHaveLength(0);
});

it('opens linking for a provisioned identity without replaying its original service request', () => {
  mockState.notifications.directory.provisioned = {
    uid: 'provisioned', acchash: 'account', type: NOTIFICATION_TYPE_VERUS_ID_PROVISIONING,
    title: 'Identity ready', body: 'Link VerusID', identityAddress: 'iReadyIdentity', chain: 'VRSC',
  };
  const navigation = {navigate: jest.fn()};
  let view;
  act(() => {view = render(navigation);});
  act(() => view.root.findByType('VerusIdReadyCard').props.onAction());
  expect(view.root.findByType('LinkVerusIdSheet').props.target).toEqual({
    identityAddress: 'iReadyIdentity', chain: 'VRSC', name: 'Identity ready', notificationUid: 'provisioned',
  });
  expect(navigation.navigate).not.toHaveBeenCalled();
});

it('removes completed registrations and never shows another account’s notices', () => {
  const jobs = mockState.channelStore_verusid.registrationJobs;
  expect(registrationNotifications(jobs, 'another-account')).toEqual([]);
  jobs.job.status = 'complete';
  expect(registrationNotifications(jobs, 'account')).toEqual([]);
});
