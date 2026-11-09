let mockState;

jest.mock('react-native', () => ({
  Keyboard: {dismiss: jest.fn()},
  Dimensions: {get: () => ({width: 400, height: 800})},
  View: 'View',
}));
jest.mock('react-native-paper', () => ({
  TextInput: 'TextInput',
  Checkbox: {Item: 'Checkbox'},
}));
jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: selector => selector(mockState),
  connect: () => Component => Component,
}));
jest.mock('../../../hooks/useObjectSelector', () => ({
  useObjectSelector: selector => selector(mockState),
}));
jest.mock('../../../actions/actionDispatchers', () => ({
  initializeAccountData: jest.fn(),
}));
jest.mock('../../../actions/actionCreators', () => ({setBiometry: jest.fn()}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({
  createAlert: jest.fn(),
}));
jest.mock('../../../actions/actions/sendModal/dispatchers/sendModal', () => ({
  closeSendModal: jest.fn(),
  setSendModalDataField: jest.fn(),
  setSendModalVisible: jest.fn(),
}));
jest.mock('../../../components/SendModal/SendModal.render', () => ({
  SendModalRender: () => null,
}));
jest.mock('../../../components/Button', () => 'Button');
jest.mock('../../../components/AnimatedActivityIndicatorBox', () => 'Spinner');
jest.mock('../../../styles', () => ({}));
jest.mock('../../keychain/keychain', () => ({getSupportedBiometryType: jest.fn()}));
jest.mock('../../keychain/biometrics', () => ({
  getBiometricPassword: jest.fn(),
  isBiometricPasswordUnavailableError: jest.fn(),
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {initializeAccountData} = require('../../../actions/actionDispatchers');
const {createAlert} = require('../../../actions/actions/alert/dispatchers/alert');
const {setSendModalVisible} = require('../../../actions/actions/sendModal/dispatchers/sendModal');
const AuthenticateUserPassword = require('../../../components/SendModal/AuthenticateUser/AuthenticateUserPassword/AuthenticateUserPassword').default;
const SendModal = require('../../../components/SendModal/SendModal').default;
const {sendModal} = require('../../../reducers/sendModal');
const {
  AUTHENTICATE_USER_SEND_MODAL,
  SEND_MODAL_FORM_STEP_RESULT,
  SEND_MODAL_USER_TO_AUTHENTICATE,
} = require('../../constants/sendModal');
const {SIGN_OUT} = require('../../constants/storeType');

const account = {id: 'T1@', accountHash: 'fixture-account', biometry: false};
const password = 'fixture password';
let view;

beforeEach(() => {
  jest.clearAllMocks();
  initializeAccountData.mockReset();
  createAlert.mockResolvedValue(true);
  mockState = {
    authentication: {accounts: [account], activeAccount: null},
    settings: {generalWalletSettings: {}},
    sendModal: {
      type: AUTHENTICATE_USER_SEND_MODAL,
      requestId: 'login-request',
      visible: true,
      data: {[SEND_MODAL_USER_TO_AUTHENTICATE]: account.accountHash},
    },
  };
});

afterEach(() => {
  if (view) act(() => view.unmount());
  view = null;
});

const mountPasswordForm = () => {
  const props = {
    route: {params: {account}},
    navigation: {navigate: jest.fn()},
    updateSendFormData: jest.fn(),
    setPreventExit: jest.fn().mockResolvedValue(undefined),
  };

  act(() => { view = create(<AuthenticateUserPassword {...props} />); });
  act(() => view.root.findByType('TextInput').props.onChangeText(password));

  return {
    props,
    unlock: view.root.findAllByType('Button').find(button =>
      button.props.children === 'Unlock',
    ).props.onPress,
  };
};

it('shows the channel failure after rollback has unmounted the login form', async () => {
  let rejectInitialization;
  initializeAccountData.mockImplementation(() => new Promise((_, reject) => {
    rejectInitialization = reject;
  }));
  const {props, unlock} = mountPasswordForm();
  let pending;

  await act(async () => { pending = unlock(); await Promise.resolve(); });
  expect(view.root.findAllByType('Spinner')).toHaveLength(1);

  // initializeAccountData signs out before rejecting a channel failure. That
  // resets the global dialog and unmounts this form before its catch resumes.
  mockState.sendModal = sendModal(mockState.sendModal, {type: SIGN_OUT});
  act(() => view.unmount());
  view = null;
  const failure = Object.assign(new Error('Failed to initialize a wallet channel.'), {
    failures: [new Error('Unable to load wallet data.')],
    protectedData: {password},
  });
  await act(async () => { rejectInitialization(failure); await pending; });

  expect(createAlert).toHaveBeenCalledTimes(1);
  expect(createAlert).toHaveBeenCalledWith('Unable to log in', 'Unable to load wallet data.');
  expect(props.navigation.navigate).not.toHaveBeenCalled();
  expect(props.setPreventExit.mock.calls).toEqual([[true], [false]]);
  expect(mockState.sendModal.visible).toBe(false);
});

it('uses safe fallback text instead of serializing an unexpected rejection', async () => {
  initializeAccountData.mockRejectedValue({failures: {protectedData: {password}}});
  const {unlock} = mountPasswordForm();

  await act(async () => unlock());

  expect(createAlert).toHaveBeenCalledWith(
    'Unable to log in',
    'Unable to unlock this profile. Please try again.',
  );
  expect(view.root.findAllByType('Spinner')).toHaveLength(0);
});

it('preserves successful login without showing an error', async () => {
  initializeAccountData.mockResolvedValue(undefined);
  const {props, unlock} = mountPasswordForm();

  await act(async () => unlock());

  expect(initializeAccountData).toHaveBeenCalledWith(account, password, false);
  expect(props.navigation.navigate).toHaveBeenCalledWith(SEND_MODAL_FORM_STEP_RESULT);
  expect(createAlert).not.toHaveBeenCalled();
  expect(props.setPreventExit.mock.calls).toEqual([[true], [false]]);
});

it.each([
  'Incorrect password',
  'Please select an existing user',
  'Please enter a password',
])('does not duplicate the existing password-validation alert: %s', async message => {
  initializeAccountData.mockRejectedValue(new Error(message));
  const {props, unlock} = mountPasswordForm();

  await act(async () => unlock());

  expect(createAlert).not.toHaveBeenCalled();
  expect(props.navigation.navigate).not.toHaveBeenCalled();
  expect(props.setPreventExit.mock.calls).toEqual([[true], [false]]);
  expect(view.root.findAllByType('TextInput')).toHaveLength(1);
});

it('does not reopen the cleared modal when the rollback error alert is dismissed', () => {
  const props = {
    sendModal: mockState.sendModal,
    alertActive: null,
    hasAuthenticatedSession: false,
  };
  act(() => { view = create(<SendModal {...props} />); });

  const cleared = sendModal(props.sendModal, {type: SIGN_OUT});
  act(() => view.update(<SendModal {...props} sendModal={cleared} alertActive={{uid: 'error'}} />));
  expect(setSendModalVisible).toHaveBeenLastCalledWith(false);

  act(() => view.update(<SendModal {...props} sendModal={cleared} />));
  expect(setSendModalVisible).toHaveBeenLastCalledWith(false);
  expect(setSendModalVisible).not.toHaveBeenCalledWith(true);
});

it('restores a still-open login dialog after its alert is dismissed', () => {
  const props = {
    sendModal: mockState.sendModal,
    alertActive: null,
    hasAuthenticatedSession: false,
  };
  act(() => { view = create(<SendModal {...props} />); });
  act(() => view.update(<SendModal {...props} alertActive={{uid: 'error'}} />));
  expect(setSendModalVisible).toHaveBeenLastCalledWith(false);

  act(() => view.update(<SendModal {...props} />));
  expect(setSendModalVisible).toHaveBeenLastCalledWith(true);
});
