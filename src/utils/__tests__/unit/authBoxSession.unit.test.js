let mockState;
const mockGetSessionCredential = jest.fn();
const mockDecryptKey = jest.fn();

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {getState: jest.fn(() => mockState)},
}));

jest.mock('../../keychain/keychain', () => ({
  getSessionCredential: mockGetSessionCredential,
  setSessionCredential: jest.fn(),
}));

jest.mock('../../seedCrypt', () => ({
  decryptkey: mockDecryptKey,
  encryptkey: jest.fn(),
}));

jest.mock('../../crypto/randomBytes', () => ({randomBytes: jest.fn()}));

const {requestPrivKey, requestSeeds} = require('../../auth/authBox');

const stateFor = (accountHash, sessionEpoch, suffix) => ({
  authentication: {
    // AUTHENTICATE_USER installs the account and session key before channel
    // initialization completes and SIGN_IN_USER flips this flag.
    signedIn: false,
    activeAccount: {
      accountHash,
      seeds: {dlight_private: `encrypted-seed-${suffix}`},
      keys: {
        VRSC: {vrpc: {encryptedPrivKey: `encrypted-${suffix}`}},
      },
    },
    sessionEpoch,
    sessionKey: `session-${suffix}`,
  },
});

const deferred = () => {
  let resolve;
  const promise = new Promise(promiseResolve => {
    resolve = promiseResolve;
  });
  return {promise, resolve};
};

describe('private-key session binding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = stateFor('account-a', 1, 'a');
    mockDecryptKey.mockImplementation((key, value) => {
      if (key === 'session-a' && value === 'credential-a') return 'password-a';
      if (key === 'password-a' && value === 'encrypted-a') return 'private-a';
      if (key === 'password-a' && value === 'encrypted-seed-a') return 'seed-a';
      return false;
    });
  });

  it('does not return account-A key material after switching to account B', async () => {
    const credential = deferred();
    mockGetSessionCredential.mockReturnValueOnce(credential.promise);
    const request = requestPrivKey('VRSC', 'vrpc', {
      sessionScope: {
        sessionScoped: true,
        accountHash: 'account-a',
        sessionEpoch: 1,
      },
    });

    mockState = stateFor('account-b', 2, 'b');
    credential.resolve('credential-a');

    await expect(request).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(mockDecryptKey).not.toHaveBeenCalled();
  });

  it('decrypts the key while an authenticated account is initializing', async () => {
    mockGetSessionCredential.mockResolvedValue('credential-a');

    await expect(
      requestPrivKey('VRSC', 'vrpc', {
        sessionScope: {
          sessionScoped: true,
          accountHash: 'account-a',
          sessionEpoch: 1,
        },
      }),
    ).resolves.toBe('private-a');

    expect(mockDecryptKey.mock.calls).toEqual([
      ['session-a', 'credential-a'],
      ['password-a', 'encrypted-a'],
    ]);
  });

  it('retrieves the DLight seed while an authenticated account is initializing', async () => {
    mockGetSessionCredential.mockResolvedValue('credential-a');

    await expect(requestSeeds()).resolves.toEqual(
      expect.objectContaining({dlight_private: 'seed-a'}),
    );
  });

  it('rejects key access after sign-out starts', async () => {
    mockState = {
      ...mockState,
      authentication: {
        ...mockState.authentication,
        signedIn: false,
        sessionKey: null,
      },
    };

    await expect(
      requestPrivKey('VRSC', 'vrpc'),
    ).rejects.toThrow('You must be signed in to retrieve sensitive info');
    expect(mockGetSessionCredential).not.toHaveBeenCalled();
    expect(mockDecryptKey).not.toHaveBeenCalled();
  });
});
