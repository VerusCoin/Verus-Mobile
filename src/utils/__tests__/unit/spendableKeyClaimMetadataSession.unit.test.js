let mockState;

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(() => mockState),
  },
}));

const {
  linkClaimedIdentitiesForSession,
  unlinkGiftedIdentitiesForSession,
} = require('../../spendableKey/claimMetadataSession');
const {reconcileSpendableKeyClaimResults} = require('../../spendableKey/claimResultReconciliation');

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

  const linkOptions = fullName => ({
    results: [{type: 'identity', coinObj: {id: 'VRSCTEST'}, identity: {
      identityAddress: 'identity-address', fullyQualifiedName: fullName,
    }}],
    requestContext: {sessionScope: {sessionScoped: true, accountHash: 'account-a', sessionEpoch: 1}},
    activeAccount: {id: 'account-a-id', accountHash: 'account-a'},
    activeCoinList: [],
    dispatch: jest.fn(),
    linkIdentity: jest.fn().mockResolvedValue(),
    updateIdentityWallet: jest.fn().mockResolvedValue(),
    clearLifecycle: jest.fn(),
    createSetUserCoinsAction: jest.fn(() => ({type: 'SET_USER_COINS', payload: {activeCoinsForUser: []}})),
    refreshLifecycles: jest.fn(),
  });

  it.each(['identity.VRSC@', 'identity.VRSCTEST@', 'identity.dudecoin.VRSCTEST@'])(
    'passes the full claimed name %s to the link writer', async fullName => {
      const options = linkOptions(fullName);
      await linkClaimedIdentitiesForSession(options);
      expect(options.linkIdentity).toHaveBeenCalledWith(
        'identity-address', fullName, 'VRSCTEST', options.requestContext,
      );
      expect(options.updateIdentityWallet).toHaveBeenCalledWith(options.requestContext);
    },
  );

  it('reports a missing full name as a metadata error without saving an address-only link', async () => {
    const options = linkOptions(undefined);
    const addMissingRedeemedCurrencies = jest.fn().mockResolvedValue();
    const result = await reconcileSpendableKeyClaimResults({
      results: options.results,
      requestContext: options.requestContext,
      linkClaimedIdentities: () => linkClaimedIdentitiesForSession(options),
      addMissingRedeemedCurrencies,
    });

    expect(result.identityLinkError.message).toMatch(/full name.*Link it manually/);
    expect(result.currencyAddError).toBeNull();
    expect(options.linkIdentity).not.toHaveBeenCalled();
    expect(options.updateIdentityWallet).not.toHaveBeenCalled();
    expect(addMissingRedeemedCurrencies).toHaveBeenCalledWith(options.results, options.requestContext);
  });

  it.each([undefined, null, '', '   '])(
    'links and refreshes valid identities around an unavailable full name (%p)', async fullName => {
      const options = linkOptions('first.VRSCTEST@');
      options.results.push(
        {type: 'identity', coinObj: {id: 'UNLINKED'}, identity: {
          identityAddress: 'missing-name', fullyQualifiedName: fullName,
        }},
        {type: 'identity', coinObj: {id: 'VRSC'}, identity: {
          identityAddress: 'last-identity', fullyQualifiedName: 'last.VRSC@',
        }},
      );
      const addMissingRedeemedCurrencies = jest.fn().mockResolvedValue();

      const result = await reconcileSpendableKeyClaimResults({
        results: options.results,
        requestContext: options.requestContext,
        linkClaimedIdentities: () => linkClaimedIdentitiesForSession(options),
        addMissingRedeemedCurrencies,
      });

      expect(result.identityLinkError.message).toMatch(/missing-name.*Link it manually/);
      expect(result.currencyAddError).toBeNull();
      expect(options.linkIdentity.mock.calls).toEqual([
        ['identity-address', 'first.VRSCTEST@', 'VRSCTEST', options.requestContext],
        ['last-identity', 'last.VRSC@', 'VRSC', options.requestContext],
      ]);
      expect(options.updateIdentityWallet).toHaveBeenCalledWith(options.requestContext);
      expect(options.clearLifecycle.mock.calls).toEqual([['VRSCTEST'], ['VRSC']]);
      expect(options.createSetUserCoinsAction).toHaveBeenCalledWith(
        options.activeCoinList, options.activeAccount.id,
      );
      expect(options.dispatch).toHaveBeenCalledWith({
        type: 'SET_USER_COINS',
        payload: {activeCoinsForUser: []},
        meta: options.requestContext.sessionScope,
      });
      expect(options.refreshLifecycles).toHaveBeenCalledWith([]);
      expect(addMissingRedeemedCurrencies).toHaveBeenCalledWith(options.results, options.requestContext);
    },
  );

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
      'identity.VRSC@',
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

  it('refreshes affected coin lifecycles after unlinking gifted identities', async () => {
    const requestContext = {
      sessionScope: {
        sessionScoped: true,
        accountHash: 'account-a',
        sessionEpoch: 1,
      },
    };
    const activeCoinList = [{id: 'VRSC', users: ['account-a-id']}];
    const unlinkIdentity = jest.fn().mockResolvedValue();
    const updateIdentityWallet = jest.fn().mockResolvedValue();
    const clearLifecycle = jest.fn();
    const dispatch = jest.fn();
    const refreshLifecycles = jest.fn();
    const setUserCoinsAction = {
      type: 'SET_USER_COINS',
      payload: {activeCoinsForUser: [{id: 'VRSC'}]},
    };
    const createSetUserCoinsAction = jest.fn(() => setUserCoinsAction);

    await unlinkGiftedIdentitiesForSession({
      identities: [
        {identityAddress: 'identity-a', chain: 'VRSC'},
        {identityAddress: 'identity-b', chain: 'VRSC'},
      ],
      requestContext,
      activeAccount: {id: 'account-a-id', accountHash: 'account-a'},
      activeCoinList,
      dispatch,
      unlinkIdentity,
      updateIdentityWallet,
      clearLifecycle,
      createSetUserCoinsAction,
      refreshLifecycles,
    });

    expect(unlinkIdentity).toHaveBeenNthCalledWith(
      1,
      'identity-a',
      'VRSC',
      requestContext,
    );
    expect(unlinkIdentity).toHaveBeenNthCalledWith(
      2,
      'identity-b',
      'VRSC',
      requestContext,
    );
    expect(updateIdentityWallet).toHaveBeenCalledWith(requestContext);
    expect(clearLifecycle).toHaveBeenCalledTimes(1);
    expect(clearLifecycle).toHaveBeenCalledWith('VRSC');
    expect(createSetUserCoinsAction).toHaveBeenCalledWith(
      activeCoinList,
      'account-a-id',
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: setUserCoinsAction.type,
        meta: expect.objectContaining({
          accountHash: 'account-a',
          sessionEpoch: 1,
          sessionScoped: true,
        }),
      }),
    );
    expect(refreshLifecycles).toHaveBeenCalledWith(
      setUserCoinsAction.payload.activeCoinsForUser,
    );
  });
});
