import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationSaga from '../../../sagas/notifications';
import {notifications} from '../../../reducers/notifications';
import {clearAccountNotifications} from '../../../actions/actions/notifications/creators/notifications';
import {loadNotifications, storeNotifications} from '../../asyncStore/notificationsStorage';

const {runSaga, stdChannel} = jest.requireActual('redux-saga');
const flush = () => new Promise(resolve => setImmediate(resolve));
let state, task, dispatch;

beforeEach(async () => {
  await AsyncStorage.clear();
  state = {
    notifications: {
      directory: {
        mine: {uid: 'mine', acchash: 'account-a'},
        theirs: {uid: 'theirs', acchash: 'account-b'},
        // A literal "undefined" UID must not be removed by a missing action UID.
        undefined: {uid: 'undefined', acchash: 'account-b'},
      },
      accounts: {'account-a': ['mine'], 'account-b': ['theirs', 'undefined']},
    },
    channelStore_verusid: {registrationJobs: {
      job: {id: 'job', accountHash: 'account-a', status: 'commitment_confirmed'},
    }},
  };
  const channel = stdChannel();
  dispatch = action => {
    state = {...state, notifications: notifications(state.notifications, action)};
    channel.put(action);
  };
  task = runSaga({channel, getState: () => state, dispatch}, notificationSaga);
});

afterEach(async () => {
  task.cancel();
  await task.toPromise();
});

it('clears only the selected profile in Redux and saved notifications while keeping registration jobs', async () => {
  const registrationJobs = state.channelStore_verusid.registrationJobs;
  const otherProfile = state.notifications.directory.theirs;
  const otherUndefinedUid = state.notifications.directory.undefined;
  await storeNotifications(state.notifications);

  dispatch(clearAccountNotifications('account-a'));
  await flush();

  expect(state.notifications).toEqual({
    directory: {theirs: otherProfile, undefined: otherUndefinedUid},
    accounts: {'account-b': ['theirs', 'undefined']},
  });
  await expect(loadNotifications()).resolves.toEqual(state.notifications);
  expect(state.channelStore_verusid.registrationJobs).toBe(registrationJobs);
  expect(task.isRunning()).toBe(true);
});

it.each([{}, {'account-a': ['theirs'], 'account-b': ['mine', 'theirs', 'undefined']}])(
  'uses notification ownership even with missing or stale account indexes: %p',
  async accounts => {
    state.notifications.accounts = accounts;
    dispatch(clearAccountNotifications('account-a'));
    await flush();

    expect(state.notifications.directory).toEqual({
      theirs: {uid: 'theirs', acchash: 'account-b'},
      undefined: {uid: 'undefined', acchash: 'account-b'},
    });
    expect(state.notifications.accounts).not.toHaveProperty('account-a');
    expect(state.notifications.accounts['account-b'] || []).not.toContain('mine');
    await expect(loadNotifications()).resolves.toEqual(state.notifications);
    expect(task.isRunning()).toBe(true);
  },
);

it('preserves persistent notifications and their profile index', async () => {
  const persistent = {uid: 'persistent', acchash: 'account-a', persistent: true};
  state.notifications.directory.persistent = persistent;
  state.notifications.accounts['account-a'].push('persistent');

  dispatch(clearAccountNotifications('account-a'));
  await flush();

  expect(state.notifications.directory).not.toHaveProperty('mine');
  expect(state.notifications.directory.persistent).toBe(persistent);
  expect(state.notifications.accounts['account-a']).toEqual(['persistent']);
  await expect(loadNotifications()).resolves.toEqual(state.notifications);
});

it('safely clears a profile with no saved notifications', async () => {
  const original = state.notifications;
  dispatch(clearAccountNotifications('empty-account'));
  await flush();

  expect(state.notifications).toEqual(original);
  await expect(loadNotifications()).resolves.toEqual(original);
  expect(task.isRunning()).toBe(true);
});

it.each([undefined, null, ''])('does nothing without a valid profile: %p', async accountHash => {
  const original = state.notifications;
  await storeNotifications(original);

  dispatch(clearAccountNotifications(accountHash));
  await flush();

  expect(state.notifications).toBe(original);
  await expect(loadNotifications()).resolves.toEqual(original);
  expect(task.isRunning()).toBe(true);
});
