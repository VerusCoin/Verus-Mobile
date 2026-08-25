const mockSetBiometry = jest.fn();

jest.mock('../../../actions/actionCreators', () => ({
  setBiometry: (...args) => mockSetBiometry(...args),
}));

const {
  disableBiometryForUnavailableLogin,
  resolveAuthenticationAccount,
} = require('../../../components/SendModal/AuthenticateUser/AuthenticateUserPassword/AuthenticateUserPassword');
const {
  createBiometricPasswordNotFoundError,
} = require('../../keychain/keychain');
const {authentication} = require('../../../reducers/authentication');
const {
  AUTHENTICATE_USER,
  BIOMETRIC_AUTH,
} = require('../../constants/storeType');

describe('biometric profile login', () => {
  beforeEach(() => {
    mockSetBiometry.mockReset();
  });

  it('disables biometric login when the selected account is absent from the vault', async () => {
    const action = {type: 'BIOMETRIC_AUTH'};
    const dispatch = jest.fn();
    mockSetBiometry.mockResolvedValue(action);

    await expect(
      disableBiometryForUnavailableLogin(
        createBiometricPasswordNotFoundError('account-hash'),
        'account-hash',
        dispatch,
      ),
    ).resolves.toBe(true);

    expect(mockSetBiometry).toHaveBeenCalledWith('account-hash', false);
    expect(dispatch).toHaveBeenCalledWith(action);
  });

  it('keeps biometric login enabled after a cancellation or transient error', async () => {
    const dispatch = jest.fn();
    const cancellation = Object.assign(new Error('Authentication cancelled'), {
      code: 'E_BIOMETRIC_AUTH_CANCELLED',
    });

    await expect(
      disableBiometryForUnavailableLogin(
        cancellation,
        'account-hash',
        dispatch,
      ),
    ).resolves.toBe(false);

    expect(mockSetBiometry).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('disables biometric login after enrollment permanently invalidates the vault', async () => {
    const action = {type: 'BIOMETRIC_AUTH'};
    const dispatch = jest.fn();
    const enrollmentChanged = Object.assign(
      new Error('Biometric enrollment changed'),
      {code: 'BIOMETRIC_ENROLLMENT_CHANGED'},
    );
    mockSetBiometry.mockResolvedValue(action);

    await expect(
      disableBiometryForUnavailableLogin(
        enrollmentChanged,
        'account-hash',
        dispatch,
      ),
    ).resolves.toBe(true);

    expect(mockSetBiometry).toHaveBeenCalledWith('account-hash', false);
    expect(dispatch).toHaveBeenCalledWith(action);
  });

  it('uses the updated Redux account instead of stale navigation parameters', () => {
    const staleRouteAccount = {
      id: 'Alice',
      accountHash: 'account-hash',
      biometry: true,
    };
    const updatedAccount = {...staleRouteAccount, biometry: false};

    expect(
      resolveAuthenticationAccount(
        [updatedAccount],
        staleRouteAccount,
        null,
      ),
    ).toBe(updatedAccount);
  });

  it('keeps biometry disabled when password login follows the missing-vault update', () => {
    const staleRouteAccount = {
      id: 'Alice',
      accountHash: 'account-hash',
      biometry: true,
    };
    const updatedAccount = {...staleRouteAccount, biometry: false};
    const signedOut = {
      ...authentication(undefined, {type: '@@init'}),
      activeAccount: null,
      accounts: [staleRouteAccount],
    };
    const afterDisable = authentication(signedOut, {
      type: BIOMETRIC_AUTH,
      payload: {
        accountHash: 'account-hash',
        biometry: false,
        accounts: [updatedAccount],
      },
    });
    const afterLogin = authentication(afterDisable, {
      type: AUTHENTICATE_USER,
      activeAccount: staleRouteAccount,
      sessionKey: 'session-key',
    });

    expect(afterLogin.activeAccount.biometry).toBe(false);
  });

  it('disables the active account when the missing-vault update finishes after login', () => {
    const staleAccount = {
      id: 'Alice',
      accountHash: 'account-hash',
      biometry: true,
    };
    const signedOut = {
      ...authentication(undefined, {type: '@@init'}),
      activeAccount: null,
      accounts: [staleAccount],
    };
    const afterLogin = authentication(signedOut, {
      type: AUTHENTICATE_USER,
      activeAccount: staleAccount,
      sessionKey: 'session-key',
    });
    const updatedAccount = {...staleAccount, biometry: false};

    const afterDisable = authentication(afterLogin, {
      type: BIOMETRIC_AUTH,
      payload: {
        accountHash: 'account-hash',
        biometry: false,
        accounts: [updatedAccount],
      },
    });

    expect(afterDisable.activeAccount.biometry).toBe(false);
  });
});
