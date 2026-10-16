let mockState;
const mockAlert = jest.fn();
const mockClear = jest.fn();
const mockRemove = jest.fn();
jest.mock('react-redux', () => ({useSelector: selector => selector(mockState)}));
jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity',
  Alert: {alert: mockAlert}, StyleSheet: {create: value => value, hairlineWidth: 1},
}));
jest.mock('react-native-paper', () => ({Card: 'Card', IconButton: 'IconButton'}));
jest.mock('../../../images/customIcons', () => ({
  VerusIdAtIcon: 'VerusIdAtIcon', ReceivedIcon: 'ReceivedIcon', VerusIdErrorIcon: 'VerusIdErrorIcon',
}));
jest.mock('../../../containers/Services/ServiceComponents/VerusIdService/VerusIdLogin', () => ({processVerusId: jest.fn()}));
jest.mock('../../../actions/actions/notifications/dispatchers/notifications', () => ({
  dispatchClearNotifications: mockClear, dispatchRemoveNotification: mockRemove,
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const NotificationWidget = require('../../../containers/Home/HomeWidgets/NotificationWidget').default;
const {registrationNotifications} = require('../../identityRegistration/notifications');
const {NOTIFICATION_TYPE_BASIC, NOTIFICATION_ICON_TX} = require('../../constants/notifications');
const longName = 'a-long-identity-name.in-a-long-namespace.VRSCTEST@';
const textContent = node => typeof node === 'string' ? node :
  (node.children || []).map(textContent).join('');
const notice = view => view.root.findByProps({testID: 'registration-notice-job'});
const render = navigation => create(<NotificationWidget navigation={navigation} />);

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
  };
});

it('keeps status and action separate, announces the full name, and opens progress from the whole notice', () => {
  const navigation = {navigate: jest.fn()};
  let view;
  act(() => {view = render(navigation);});
  const row = notice(view);
  const labels = row.findAllByType('Text');
  expect(labels.map(textContent)).toEqual([
    longName, 'Name commitment awaiting confirmation', 'View progress ›',
  ]);
  labels.forEach(label => {
    // Compact previews may shorten the name; status and CTA must stay visible.
    expect(label.props.numberOfLines).toBe(textContent(label) === longName ? 2 : undefined);
    expect(label.props.allowFontScaling).not.toBe(false);
  });
  // Status and action share the vertical content column, instead of competing
  // for horizontal space with the identity name as in the overflowing tray.
  expect(labels[0].parent).toBe(labels[1].parent);
  expect(labels[1].parent).toBe(labels[2].parent);
  expect(labels[0].parent.props.style.flexDirection).not.toBe('row');
  expect(row.props.accessibilityRole).toBe('button');
  expect(row.props.accessibilityLabel).toContain(longName);
  expect(row.props.style.minHeight).toBeGreaterThanOrEqual(44);
  expect(JSON.stringify(view.toJSON())).not.toContain('iTechnicalAddress');
  act(() => row.props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('ServicesHome', {
    screen: 'IdentityRegistration',
    params: {screen: 'IdentityRegistrationProgress', params: {jobId: 'job'}},
  });
});

it('changes the same persistent notice into a registration action when the commitment confirms', () => {
  let view;
  act(() => {view = render({navigate: jest.fn()});});
  mockState.channelStore_verusid.registrationJobs.job.status = 'commitment_confirmed';
  act(() => view.update(<NotificationWidget navigation={{navigate: jest.fn()}} />));
  expect(textContent(notice(view))).toContain('Name committed. Ready to register.');
  expect(textContent(notice(view))).toContain('Continue registration');
  expect(notice(view).findAllByProps({accessibilityLabel: 'Dismiss notification'})).toHaveLength(0);
  expect(registrationNotifications(mockState.channelStore_verusid.registrationJobs, 'account')[0].persistent).toBe(true);
});

it('keeps registration notices after clearing ordinary notifications and supports collapse', () => {
  mockState.notifications.directory.message = {
    uid: 'message', acchash: 'account', type: NOTIFICATION_TYPE_BASIC,
    icon: NOTIFICATION_ICON_TX, title: ['Payment ', 'received'], body: 'A wallet payment',
  };
  mockClear.mockImplementation(() => {mockState.notifications.directory = {};});
  let view;
  act(() => {view = render({navigate: jest.fn()});});
  const clear = view.root.findAllByType('TouchableOpacity').find(item => textContent(item) === 'Clear all');
  act(() => clear.props.onPress());
  act(() => mockAlert.mock.calls[0][2].find(action => action.text === 'Clear').onPress());
  act(() => view.update(<NotificationWidget navigation={{navigate: jest.fn()}} />));
  expect(notice(view)).toBeDefined();
  expect(mockClear).toHaveBeenCalledTimes(1);
  expect(mockRemove).not.toHaveBeenCalled();
  const toggle = view.root.findAllByType('TouchableOpacity').find(item => item.props.accessibilityState);
  act(() => toggle.props.onPress());
  expect(view.root.findAllByProps({testID: 'registration-notice-job'})).toHaveLength(0);
  act(() => view.root.findAllByType('TouchableOpacity').find(item => item.props.accessibilityState).props.onPress());
  expect(notice(view)).toBeDefined();
});

it('keeps a registered identity visible until the user explicitly links it', () => {
  const jobs = mockState.channelStore_verusid.registrationJobs;
  jobs.job.status = 'registered';
  jobs.job.linked = false;
  const notification = registrationNotifications(jobs, 'account')[0];
  expect(notification).toMatchObject({
    persistent: true, statusText: 'Identity registered. Ready to link.', body: 'Link to wallet',
  });
  const navigation = {navigate: jest.fn()};
  let view;
  act(() => {view = render(navigation);});
  expect(textContent(notice(view))).toContain('Link to wallet');
  act(() => notice(view).props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('ServicesHome', {
    screen: 'IdentityRegistration',
    params: {screen: 'IdentityRegistrationProgress', params: {jobId: 'job'}},
  });
  expect(jobs.job.linked).toBe(false);
  jobs.job.status = 'complete';
  jobs.job.linked = true;
  act(() => view.update(<NotificationWidget navigation={navigation} />));
  expect(view.root.findAllByProps({testID: 'registration-notice-job'})).toHaveLength(0);
});

it.each(['complete', 'cancelled_tracking'])('removes %s registrations and never shows another account’s notices', status => {
  const jobs = mockState.channelStore_verusid.registrationJobs;
  expect(registrationNotifications(jobs, 'another-account')).toEqual([]);
  jobs.job.status = status;
  expect(registrationNotifications(jobs, 'account')).toEqual([]);
});
