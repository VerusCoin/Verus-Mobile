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
