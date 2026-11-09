const mockDispatch = jest.fn();
const mockResetPwd = jest.fn();
const mockRemoveBiometricPassword = jest.fn();

jest.mock('../../../components/StandardButton', () => () => null);

jest.mock('../../../actions/actionCreators', () => ({
  resetPwd: mockResetPwd,
  signOut: jest.fn(),
}));

jest.mock('../../keychain/biometrics', () => ({
  removeBiometricPassword: mockRemoveBiometricPassword,
}));

jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({
  createAlert: jest.fn(),
}));

jest.mock('react-redux', () => ({
  connect: () => Component => Component,
}));

const {ResetPwd} = require(
  '../../../containers/Settings/ProfileSettings/ResetPwd/ResetPwd',
);

const createScreen = () => {
  const screen = new ResetPwd();
  screen.props = {
    activeAccount: {
      id: 'alice',
      accountHash: 'account-a',
      biometry: true,
    },
    dispatch: mockDispatch,
  };
  screen.state = {
    ...screen.state,
    oldPwd: 'old-password',
    newPwd: 'new-password',
    confirmNewPwd: 'new-password',
  };
  screen.setState = (update, callback) => {
    screen.state = {...screen.state, ...update};
    if (callback) callback();
  };
  screen.canReset = jest.fn().mockResolvedValue(true);

  let resolveSuccess;
  const succeeded = new Promise(resolve => {
    resolveSuccess = resolve;
  });
  screen.onSuccess = jest.fn(resolveSuccess);

  return {screen, succeeded};
};

describe('password reset biometric cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResetPwd.mockResolvedValue({
      type: 'BIOMETRIC_AUTH',
      payload: {biometry: false},
    });
    mockRemoveBiometricPassword.mockResolvedValue(true);
  });

  it('dispatches the durably disabled biometric state before removing the stored password', async () => {
    const {screen, succeeded} = createScreen();

    screen.validateFormData();
    await succeeded;

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'BIOMETRIC_AUTH',
      payload: {biometry: false},
    });
    expect(mockDispatch.mock.invocationCallOrder[0]).toBeLessThan(
      mockRemoveBiometricPassword.mock.invocationCallOrder[0],
    );
  });

  it('finishes successfully if stored biometric password removal is cancelled', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRemoveBiometricPassword.mockRejectedValue(new Error('cancelled'));
    const {screen, succeeded} = createScreen();

    screen.validateFormData();
    await succeeded;

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'BIOMETRIC_AUTH',
      payload: {biometry: false},
    });
    expect(mockRemoveBiometricPassword).toHaveBeenCalledWith('account-a');
    expect(screen.onSuccess).toHaveBeenCalledTimes(1);
    warning.mockRestore();
  });

  it('does not remove a biometric password for an account without biometrics', async () => {
    const {screen, succeeded} = createScreen();
    screen.props.activeAccount.biometry = false;

    screen.validateFormData();
    await succeeded;

    expect(mockRemoveBiometricPassword).not.toHaveBeenCalled();
    expect(screen.onSuccess).toHaveBeenCalledTimes(1);
  });
});

describe('screen navigation reset', () => {
  it.each([true, false, undefined])('preserves the reset routes for fullReset=%s', fullReset => {
    const {screen} = createScreen();
    const data = {task: jest.fn()};
    const navigation = {
      closeDrawer: jest.fn(),
      dispatch: jest.fn().mockReturnValue('dispatch-result'),
    };
    screen.props.navigation = navigation;

    expect(screen.resetToScreen('SecureLoading', 'Title', data, fullReset)).toBeUndefined();

    const action = navigation.dispatch.mock.calls[0][0];
    expect(action).toEqual({
      type: 'RESET',
      payload: fullReset
        ? {index: 0, routes: [{name: 'SecureLoading', params: {data}}]}
        : {index: 1, routes: [{name: 'Home'}, {name: 'SecureLoading', params: {title: 'Title', data}}]},
    });
    expect(action.payload.routes[fullReset ? 0 : 1].params.data).toBe(data);
    expect(navigation.closeDrawer.mock.invocationCallOrder[0]).toBeLessThan(
      navigation.dispatch.mock.invocationCallOrder[0],
    );
  });

  it('does not dispatch a reset if closing the drawer fails', () => {
    const {screen} = createScreen();
    const error = new Error('drawer unavailable');
    screen.props.navigation = {
      closeDrawer: jest.fn(() => { throw error; }),
      dispatch: jest.fn(),
    };
    expect(() => screen.resetToScreen('Home')).toThrow(error);
    expect(screen.props.navigation.dispatch).not.toHaveBeenCalled();
  });
});
