let mockState;

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(() => mockState),
  },
}));

const {
  linkClaimedIdentitiesForSession,
} = require('../../spendableKey/claimMetadataSession');

const deferred = () => {
  let resolve;
  const promise = new Promise(promiseResolve => {
    resolve = promiseResolve;
  });
  return {promise, resolve};
};

const stateFor = (accountHash, sessionEpoch) => ({
  authentication: {
    activeAccount: {accountHash},
    sessionEpoch,
  },
});

describe('spendable-key claim metadata session isolation', () => {
  beforeEach(() => {
    mockState = stateFor('account-a', 1);
  });

  it('stops account-A identity linking after an A-to-B switch', async () => {
    const linkCompletion = deferred();
    const requestContext = {
      sessionScope: {
        sessionScoped: true,
        accountHash: 'account-a',
        sessionEpoch: 1,
      },
    };
    const linkIdentity = jest.fn(() => linkCompletion.promise);
    const updateIdentityWallet = jest.fn().mockResolvedValue();
    const clearLifecycle = jest.fn();
    const dispatch = jest.fn();
    const refreshLifecycles = jest.fn();
    const createSetUserCoinsAction = jest.fn(() => ({
      type: 'SET_USER_COINS',
      payload: {activeCoinsForUser: []},
    }));
    const linking = linkClaimedIdentitiesForSession({
      results: [
        {
          type: 'identity',
          coinObj: {id: 'VRSC'},
          identity: {
            identityAddress: 'identity-address',
            fullyQualifiedName: 'identity.VRSC@',
          },
        },
      ],
      requestContext,
      activeAccount: {id: 'account-a-id', accountHash: 'account-a'},
      activeCoinList: [],
      dispatch,
      linkIdentity,
      updateIdentityWallet,
      clearLifecycle,
      createSetUserCoinsAction,
      refreshLifecycles,
    });
    await new Promise(resolve => setImmediate(resolve));

    expect(linkIdentity).toHaveBeenCalledWith(
      'identity-address',
      'identity@',
      'VRSC',
      requestContext,
    );
    mockState = stateFor('account-b', 2);
    linkCompletion.resolve();

    await expect(linking).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(updateIdentityWallet).not.toHaveBeenCalled();
    expect(clearLifecycle).not.toHaveBeenCalled();
    expect(createSetUserCoinsAction).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(refreshLifecycles).not.toHaveBeenCalled();
  });
});
