const mockDispatch = jest.fn();
const mockGetState = jest.fn();
const mockRequestSeeds = jest.fn();
const mockCaptureTeardown = jest.fn();
const mockClearLifecycles = jest.fn();
const mockRemoveExistingCoin = jest.fn();
const mockDeleteUser = jest.fn();
const mockDeleteProfileAction = jest.fn();
const mockSetBiometryAction = jest.fn();
const mockRemoveBiometricPassword = jest.fn();
const mockCreateAlert = jest.fn();

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {getState: mockGetState},
}));

jest.mock('../../../actions/actionCreators', () => ({
  authenticateUser: jest.fn(),
  deleteProfile: mockDeleteProfileAction,
  setBiometry: mockSetBiometryAction,
  setAccounts: accounts => ({type: 'SET_ACCOUNTS', payload: {accounts}}),
  signOut: jest.fn(),
  updateAccountKeys: jest.fn(),
}));

jest.mock('../../asyncStore/asyncStore', () => ({
  deleteUser: mockDeleteUser,
}));

jest.mock('../../auth/authBox', () => ({
  initSession: jest.fn(),
  requestPassword: jest.fn(),
  requestSeeds: mockRequestSeeds,
}));

jest.mock('../../../actions/actions/coins/Coins', () => ({
  removeExistingCoin: mockRemoveExistingCoin,
}));

jest.mock(
  '../../../actions/actions/account/dispatchers/account',
  () => ({
    captureAccountTeardownContext: mockCaptureTeardown,
    clearActiveAccountLifecycles: mockClearLifecycles,
  }),
);

jest.mock('../../keychain/keychain', () => ({
  removeSessionCredential: jest.fn(),
}));

jest.mock('../../keychain/biometrics', () => ({
  removeBiometricPassword: mockRemoveBiometricPassword,
}));

jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({
  createAlert: mockCreateAlert,
  resolveAlert: jest.fn(),
}));

jest.mock('react-redux', () => ({
  connect: () => Component => Component,
}));

const {DLIGHT_PRIVATE} = require('../../constants/intervalConstants');
const {deleteProfile} = require('../../../actions/actions/UserData');
const DeleteProfileScreen = require(
  '../../../containers/Settings/ProfileSettings/DeleteProfile/DeleteProfile',
).default;

describe('profile deletion durability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const account = {id: 'alice', accountHash: 'account-a'};
    mockGetState.mockReturnValue({
      authentication: {activeAccount: account, sessionEpoch: 4},
    });
    mockRequestSeeds.mockResolvedValue({
      [DLIGHT_PRIVATE]: 'plaintext seed words',
    });
    mockCaptureTeardown.mockImplementation(context => ({
      ...context,
      activeCoinsForUser: [],
      dlightSockets: {},
      teardown: true,
    }));
    mockClearLifecycles.mockResolvedValue(undefined);
    mockRemoveExistingCoin.mockResolvedValue([]);
    mockDeleteUser.mockResolvedValue([]);
    mockDeleteProfileAction.mockResolvedValue(undefined);
    mockSetBiometryAction.mockResolvedValue({type: 'BIOMETRIC_AUTH'});
    mockRemoveBiometricPassword.mockResolvedValue(true);
  });

  it('retains the profile and reports a native teardown failure', async () => {
    const teardownError = new Error('native teardown failed');
    mockClearLifecycles.mockRejectedValue(teardownError);
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(deleteProfile(
      {id: 'alice', accountHash: 'account-a'},
      mockDispatch,
    )).rejects.toBe(teardownError);

    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(teardownError);
  });

  it('retains the profile and reports a coin cleanup failure', async () => {
    const coinError = new Error('coin cleanup failed');
    mockRemoveExistingCoin.mockRejectedValue(coinError);
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(deleteProfile(
      {id: 'alice', accountHash: 'account-a'},
      mockDispatch,
    )).rejects.toBe(coinError);

    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(coinError);
  });

  it('finishes native and coin cleanup before deleting durable profile data', async () => {
    const storageError = new Error('durable delete failed');
    mockDeleteUser.mockRejectedValue(storageError);

    await expect(deleteProfile(
      {id: 'alice', accountHash: 'account-a'},
      mockDispatch,
    )).rejects.toBe(storageError);

    expect(mockClearLifecycles).toHaveBeenCalledTimes(1);
    expect(mockRemoveExistingCoin).toHaveBeenCalledTimes(1);
    expect(mockClearLifecycles.mock.invocationCallOrder[0]).toBeLessThan(
      mockDeleteUser.mock.invocationCallOrder[0],
    );
    expect(mockRemoveExistingCoin.mock.invocationCallOrder[0]).toBeLessThan(
      mockDeleteUser.mock.invocationCallOrder[0],
    );
  });

  it('disables biometrics before cleanup and preserves task failure', async () => {
    const deletionError = new Error('delete failed');
    mockDeleteProfileAction.mockRejectedValue(deletionError);
    const screen = new DeleteProfileScreen();
    screen.props = {dispatch: mockDispatch};

    await expect(screen.deleteUser(
      {id: 'alice', accountHash: 'account-a'},
      true,
    )).rejects.toBe(deletionError);

    expect(mockSetBiometryAction).toHaveBeenCalledWith('account-a', false);
    expect(mockDispatch).toHaveBeenCalledWith({type: 'BIOMETRIC_AUTH'});
    expect(mockRemoveBiometricPassword).toHaveBeenCalledWith('account-a');
    expect(mockSetBiometryAction.mock.invocationCallOrder[0]).toBeLessThan(
      mockRemoveBiometricPassword.mock.invocationCallOrder[0],
    );
    expect(mockRemoveBiometricPassword.mock.invocationCallOrder[0]).toBeLessThan(
      mockDeleteProfileAction.mock.invocationCallOrder[0],
    );
    expect(mockCreateAlert).toHaveBeenCalledWith(
      'Error.',
      'Failed to delete "alice" profile.',
    );
  });

  it('does not delete the profile if biometric vault cleanup fails', async () => {
    const biometricError = new Error('biometric cleanup failed');
    mockRemoveBiometricPassword.mockRejectedValue(biometricError);
    const screen = new DeleteProfileScreen();
    screen.props = {dispatch: mockDispatch};

    await expect(screen.deleteUser(
      {id: 'alice', accountHash: 'account-a'},
      true,
    )).rejects.toBe(biometricError);

    expect(mockSetBiometryAction.mock.calls).toEqual([
      ['account-a', false],
      ['account-a', true],
    ]);
    expect(mockDispatch).toHaveBeenCalledTimes(2);
    expect(mockDeleteProfileAction).not.toHaveBeenCalled();
  });

  it('keeps the vault error primary if restoring its flag also fails', async () => {
    const biometricError = new Error('biometric cleanup failed');
    mockSetBiometryAction
      .mockResolvedValueOnce({type: 'BIOMETRIC_AUTH'})
      .mockRejectedValueOnce(new Error('flag restore failed'));
    mockRemoveBiometricPassword.mockRejectedValue(biometricError);
    const screen = new DeleteProfileScreen();
    screen.props = {dispatch: mockDispatch};

    await expect(screen.deleteUser(
      {id: 'alice', accountHash: 'account-a'},
      true,
    )).rejects.toBe(biometricError);
    expect(mockDeleteProfileAction).not.toHaveBeenCalled();
  });

  it('passes a plaintext DLight seed separately from the generic teardown context', async () => {
    const secret = 'plaintext seed words';
    mockCaptureTeardown.mockImplementation(context => ({
      ...context,
      activeCoinsForUser: [{
        id: 'VRSC',
        compatible_channels: [DLIGHT_PRIVATE],
      }],
      dlightSockets: {VRSC: false},
      teardown: true,
    }));
    mockClearLifecycles.mockImplementation(async (context, dlightSeed) => {
      expect(context).not.toHaveProperty('dlightSeed');
      for (const key of Reflect.ownKeys(context)) {
        expect(JSON.stringify(context[key])).not.toContain(secret);
      }
      expect(JSON.stringify(context)).not.toContain(secret);
      expect(dlightSeed).toBe(secret);
    });

    await deleteProfile({
      id: 'alice',
      accountHash: 'account-a',
      seeds: {[DLIGHT_PRIVATE]: 'encrypted seed'},
    }, mockDispatch);

    expect(mockRequestSeeds).toHaveBeenCalledTimes(1);
    expect(mockClearLifecycles).toHaveBeenCalledTimes(1);
    expect(mockRemoveExistingCoin.mock.calls[0][4]).not.toHaveProperty(
      'dlightSeed',
    );
  });

  it('deletes a DLight-compatible profile that has no DLight seed', async () => {
    mockCaptureTeardown.mockImplementation(context => ({
      ...context,
      activeCoinsForUser: [{
        id: 'VRSC',
        compatible_channels: [DLIGHT_PRIVATE],
      }],
      dlightSockets: {VRSC: false},
      hasDlightSeed: false,
      teardown: true,
    }));

    await deleteProfile({
      id: 'alice',
      accountHash: 'account-a',
      seeds: {},
    }, mockDispatch);

    expect(mockRequestSeeds).not.toHaveBeenCalled();
    expect(mockClearLifecycles).toHaveBeenCalledWith(
      expect.objectContaining({
        hasDlightSeed: false,
      }),
      null,
    );
    expect(mockDeleteUser).toHaveBeenCalledWith('account-a');
  });
});
