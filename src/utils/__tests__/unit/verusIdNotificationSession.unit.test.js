const mockModifyServiceStoredDataForUser = jest.fn();
const mockUpdatePendingVerusIds = jest.fn();
const mockDispatchAddNotification = jest.fn();
const mockDispatchRemoveNotification = jest.fn();
const mockRequestServiceStoredData = jest.fn();
const mockGetIdentity = jest.fn();
const mockVerifyIdProvisioningResponse = jest.fn();
const mockAxiosGet = jest.fn();
let mockState;

jest.mock('axios', () => ({get: mockAxiosGet}));

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(() => mockState),
  },
}));

jest.mock('../../../actions/actions/services/dispatchers/services', () => ({
  modifyServiceStoredDataForUser: mockModifyServiceStoredDataForUser,
}));

jest.mock(
  '../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager',
  () => ({
    updatePendingVerusIds: mockUpdatePendingVerusIds,
  }),
);

jest.mock(
  '../../../actions/actions/notifications/dispatchers/notifications',
  () => ({
    dispatchAddNotification: mockDispatchAddNotification,
    dispatchRemoveNotification: mockDispatchRemoveNotification,
  }),
);

jest.mock('../../auth/authBox', () => ({
  requestServiceStoredData: mockRequestServiceStoredData,
  requestSeeds: jest.fn(),
}));

jest.mock('../../api/channels/verusid/callCreators', () => ({
  getIdentity: mockGetIdentity,
}));

jest.mock(
  '../../api/channels/vrpc/requests/verifyIdProvisioningResponse',
  () => ({
    verifyIdProvisioningResponse: mockVerifyIdProvisioningResponse,
  }),
);

jest.mock('../../CoinData/CoinsList', () => ({
  coinsList: {
    VRSC: {id: 'VRSC', system_id: 'vrsc-system'},
    VRSCTEST: {id: 'VRSCTEST', system_id: 'vrsctest-system'},
  },
}));

jest.mock('../../notification', () => ({
  BasicNotification: jest.fn(),
  VerusIdProvisioningNotification: jest.fn(),
}));

jest.mock('../../keys', () => ({deriveKeyPair: jest.fn()}));

const {
  checkVerusIdNotificationsForUpdates,
  setRequestedVerusId,
} = require('../../../actions/actions/services/dispatchers/verusid/verusid');
const {
  handleProvisioningResponse,
} = require('../../api/channels/vrpc/requests/handleProvisioningResponse');
const {primitives} = require('verusid-ts-client');
const {
  VerusIdProvisioningNotification,
  BasicNotification,
} = require('../../notification');

const deferred = () => {
  let resolve;
  const promise = new Promise(promiseResolve => {
    resolve = promiseResolve;
  });
  return {promise, resolve};
};

const stateFor = (accountHash, sessionEpoch) => ({
  authentication: {
    activeAccount: {
      accountHash,
      testnetOverrides: {},
      keys: {
        VRSC: {
          vrpc: {addresses: ['RAccountAddress']},
        },
      },
    },
    sessionEpoch,
  },
  channelStore_verusid: {
    pendingIds: {
      VRSC: {
        'identity-address': {
          createdAt: Math.floor(Date.now() / 1000),
          notificationUid: 'notification-a',
          status: 'pending',
        },
      },
    },
  },
});

describe('VerusID notification session isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = stateFor('account-a', 1);
    mockRequestServiceStoredData.mockResolvedValue({linked_ids: {VRSC: {}}});
    mockVerifyIdProvisioningResponse.mockResolvedValue(true);
    mockGetIdentity.mockResolvedValue({result: null});
  });

  const currentContext = () => ({
    sessionScope: {
      sessionScoped: true,
      accountHash: 'account-a',
      sessionEpoch: 1,
    },
  });

  const acceptedResponse = (signingId = 'provider') => ({
    signing_id: signingId,
    decision: {
      result: {
        state:
          primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_PENDINGAPPROVAL
            .vdxfid,
        identity_address: 'identity-address',
        fully_qualified_name: 'identity.name',
        info_uri: 'https://provider.example/status',
      },
    },
  });

  const providerReportsFailure = () => {
    Object.assign(
      mockState.channelStore_verusid.pendingIds.VRSC['identity-address'],
      {
        createdAt: Math.floor(Date.now() / 1000) - 700,
        fqn: 'identity.name',
        infoUri: 'https://provider.example/status',
        provisioningName: 'provider',
        signingId: 'provider',
      },
    );
    mockAxiosGet.mockResolvedValue({
      data: {
        signing_id: 'provider',
        decision: {
          result: {
            state:
              primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_FAILED.vdxfid,
          },
        },
      },
    });
  };

  it('tracks an accepted response from the requested provider without retaining its request', async () => {
    const setNotification = jest.fn();
    const context = currentContext();
    await handleProvisioningResponse(
      {id: 'VRSC'},
      acceptedResponse(),
      'Provider',
      'notification-a',
      'identity-address',
      'identity.name',
      'provider',
      setNotification,
      context,
    );

    const stored = mockModifyServiceStoredDataForUser.mock.calls[0][0]({});
    expect(stored.pending_ids.VRSC['identity-address']).toEqual({
      status: 'NOTIFICATION_TYPE_VERUSID_PENDING',
      fqn: 'identity.name',
      signingId: 'provider',
      createdAt: expect.any(Number),
      infoUri: 'https://provider.example/status',
      provisioningName: 'Provider',
      notificationUid: 'notification-a',
      error_desc: undefined,
    });
    expect(mockUpdatePendingVerusIds).toHaveBeenCalledWith(context);
    expect(setNotification).toHaveBeenCalledWith(context);
  });

  it('rejects a signed response from a different provider before saving status', async () => {
    const setNotification = jest.fn();
    await expect(
      handleProvisioningResponse(
        {id: 'VRSC'},
        acceptedResponse('other-provider'),
        'Provider',
        'notification-a',
        'identity-address',
        'identity.name',
        'provider',
        setNotification,
        currentContext(),
      ),
    ).rejects.toThrow('signer does not match the requested provider');
    expect(mockVerifyIdProvisioningResponse).toHaveBeenCalled();
    expect(mockModifyServiceStoredDataForUser).not.toHaveBeenCalled();
    expect(mockUpdatePendingVerusIds).not.toHaveBeenCalled();
    expect(setNotification).not.toHaveBeenCalled();
  });

  it('persists accepted provisioning status without the original request or login continuation', async () => {
    await setRequestedVerusId(
      'identity-address',
      {
        status: 'pending',
        fqn: 'identity.name',
        signingId: 'provider',
        createdAt: 1,
        infoUri: 'https://provider.example/status',
        provisioningName: 'provider',
        notificationUid: 'notice',
        loginRequest: 'old-signed-request',
        requestType: 'generic',
        hasResponseUris: true,
        fromService: 'service',
      },
      'VRSC',
      currentContext(),
    );

    const stored = mockModifyServiceStoredDataForUser.mock.calls[0][0]({});
    expect(stored.pending_ids.VRSC['identity-address']).toMatchObject({
      signingId: 'provider',
      infoUri: 'https://provider.example/status',
    });
    for (const field of [
      'loginRequest',
      'requestType',
      'hasResponseUris',
      'fromService',
    ]) {
      expect(stored.pending_ids.VRSC['identity-address']).not.toHaveProperty(
        field,
      );
    }
  });

  it.each([
    ['identity.VRSC@', 'identity@'],
    ['identity.VRSCTEST@', 'identity.VRSCTEST@'],
    ['subid.dudecoin.VRSCTEST@', 'subid.dudecoin.VRSCTEST@'],
  ])('announces a discovered %s with its full display name and a direct linking target', async (fullName, displayName) => {
    mockGetIdentity.mockResolvedValue({
      result: {
        fullyqualifiedname: fullName,
        identity: {primaryaddresses: ['RAccountAddress']},
      },
    });

    await checkVerusIdNotificationsForUpdates(currentContext());
    expect(VerusIdProvisioningNotification).toHaveBeenCalledWith(
      'Link VerusID',
      [displayName, ' is ready'],
      'notification-a',
      'account-a',
      'identity-address',
      'VRSC',
    );
  });

  it('retains a rejected provisioning attempt and reports it without a retry-login action', async () => {
    providerReportsFailure();
    const pending = mockState.channelStore_verusid.pendingIds.VRSC['identity-address'];
    const current = {
      pending_ids: {
        VRSC: {'identity-address': pending, 'other-identity': {status: 'pending'}},
      },
      registration_jobs: {registration: {status: 'complete'}},
    };

    await checkVerusIdNotificationsForUpdates(currentContext());
    expect(mockModifyServiceStoredDataForUser).toHaveBeenCalledTimes(1);
    const stored = mockModifyServiceStoredDataForUser.mock.calls[0][0](current);
    expect(stored.pending_ids.VRSC['identity-address']).toMatchObject({
      ...pending,
      status: 'NOTIFICATION_TYPE_VERUSID_FAILED',
      error_desc: ['provider@', ' failed to create identity.'],
    });
    expect(stored.pending_ids.VRSC['other-identity']).toEqual({status: 'pending'});
    expect(stored.registration_jobs).toEqual(current.registration_jobs);
    expect(mockUpdatePendingVerusIds).toHaveBeenCalledWith(currentContext());
    expect(mockGetIdentity).toHaveBeenCalledWith('vrsc-system', 'identity-address');
    expect(mockDispatchRemoveNotification).not.toHaveBeenCalled();
    expect(BasicNotification).toHaveBeenCalledWith(
      'Request a new provisioning attempt from the service.',
      expect.any(Array),
      'notification-a',
      'account-a',
    );
    expect(VerusIdProvisioningNotification).not.toHaveBeenCalled();
  });

  it('keeps checking a failed request without rewriting storage or recreating dismissed failure notices', async () => {
    providerReportsFailure();
    mockState.channelStore_verusid.pendingIds.VRSC['identity-address'].status =
      'NOTIFICATION_TYPE_VERUSID_FAILED';
    mockState.notifications = {directory: {}};

    await checkVerusIdNotificationsForUpdates(currentContext());

    expect(mockGetIdentity).toHaveBeenCalledWith('vrsc-system', 'identity-address');
    expect(mockModifyServiceStoredDataForUser).not.toHaveBeenCalled();
    expect(mockUpdatePendingVerusIds).not.toHaveBeenCalled();
    expect(mockDispatchAddNotification).not.toHaveBeenCalled();
    expect(mockDispatchRemoveNotification).not.toHaveBeenCalled();
  });

  it.each(['pending', 'NOTIFICATION_TYPE_VERUSID_FAILED'])(
    'discovers an on-chain identity despite a provider failure (previous status %s)',
    async status => {
      providerReportsFailure();
      mockState.channelStore_verusid.pendingIds.VRSC['identity-address'].status = status;
      mockGetIdentity.mockResolvedValue({
        result: {
          fullyqualifiedname: 'identity.name',
          identity: {primaryaddresses: ['RAccountAddress']},
        },
      });

      await checkVerusIdNotificationsForUpdates(currentContext());

      const writes = mockModifyServiceStoredDataForUser.mock.calls;
      const stored = writes[writes.length - 1][0]({});
      expect(stored.pending_ids.VRSC['identity-address']).toMatchObject({
        status: 'NOTIFICATION_TYPE_VERUSID_READY',
        fqn: 'identity.name',
        infoUri: 'https://provider.example/status',
      });
      expect(VerusIdProvisioningNotification).toHaveBeenCalledWith(
        'Link VerusID',
        ['identity.name@', ' is ready'],
        'notification-a',
        'account-a',
        'identity-address',
        'VRSC',
      );
      expect(mockDispatchRemoveNotification).not.toHaveBeenCalled();
    },
  );

  it('does not save or notify a provider failure verified after switching accounts', async () => {
    providerReportsFailure();
    const verification = deferred();
    mockVerifyIdProvisioningResponse.mockReturnValueOnce(verification.promise);

    const update = checkVerusIdNotificationsForUpdates(currentContext());
    await new Promise(resolve => setImmediate(resolve));
    expect(mockVerifyIdProvisioningResponse).toHaveBeenCalled();

    mockState = stateFor('account-b', 2);
    verification.resolve(true);

    await expect(update).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(mockModifyServiceStoredDataForUser).not.toHaveBeenCalled();
    expect(mockUpdatePendingVerusIds).not.toHaveBeenCalled();
    expect(mockDispatchAddNotification).not.toHaveBeenCalled();
    expect(mockDispatchRemoveNotification).not.toHaveBeenCalled();
    expect(mockGetIdentity).not.toHaveBeenCalled();
  });

  it('replaces an existing ready notice with a direct link without replaying its request', async () => {
    Object.assign(
      mockState.channelStore_verusid.pendingIds.VRSC['identity-address'],
      {
        status: 'NOTIFICATION_TYPE_VERUSID_READY',
        fqn: 'identity.name',
        loginRequest: 'old-request-that-must-not-be-reopened',
      },
    );
    mockState.notifications = {
      directory: {
        'notification-a': {
          acchash: 'account-a',
          uri: 'old-request-that-must-not-be-reopened',
          requestType: 'generic',
        },
      },
    };

    await checkVerusIdNotificationsForUpdates(currentContext());
    expect(VerusIdProvisioningNotification).toHaveBeenCalledWith(
      'Link VerusID',
      ['identity.name@', ' is ready'],
      'notification-a',
      'account-a',
      'identity-address',
      'VRSC',
    );
    expect(mockDispatchAddNotification).toHaveBeenCalledTimes(1);
    expect(mockGetIdentity).not.toHaveBeenCalled();
    expect(mockVerifyIdProvisioningResponse).not.toHaveBeenCalled();
  });

  it.each([undefined, {identityAddress: 'identity-address', chain: 'VRSC'}])(
    'does not recreate a dismissed or already current ready notice (%p)',
    async notification => {
      mockState.channelStore_verusid.pendingIds.VRSC[
        'identity-address'
      ].status = 'NOTIFICATION_TYPE_VERUSID_READY';
      mockState.notifications = {directory: {'notification-a': notification}};

      await checkVerusIdNotificationsForUpdates(currentContext());
      expect(mockDispatchAddNotification).not.toHaveBeenCalled();
      expect(mockGetIdentity).not.toHaveBeenCalled();
    },
  );

  it('serializes and opens only the identity-link destination', () => {
    const {VerusIdProvisioningNotification: Notice} =
      jest.requireActual('../../notification');
    const notice = new Notice(
      'Link VerusID',
      'Ready',
      'notice',
      'account-a',
      'identity-address',
      'VRSC',
    );
    const json = notice.toJson();
    expect(json).toMatchObject({
      identityAddress: 'identity-address',
      chain: 'VRSC',
    });
    expect(json).not.toHaveProperty('uri');
    expect(json).not.toHaveProperty('requestType');
    const link = jest.fn();
    Notice.fromJson(json, link).onAction('screen-props');
    expect(link).toHaveBeenCalledWith(
      'screen-props',
      'identity-address',
      'VRSC',
    );
  });

  it('drops account-A provisioning work that completes after switching to account B', async () => {
    const identity = deferred();
    mockGetIdentity.mockReturnValueOnce(identity.promise);
    const requestContext = {
      sessionScope: {
        sessionScoped: true,
        accountHash: 'account-a',
        sessionEpoch: 1,
      },
    };

    const update = checkVerusIdNotificationsForUpdates(requestContext);
    await new Promise(resolve => setImmediate(resolve));
    expect(mockGetIdentity).toHaveBeenCalled();

    mockState = stateFor('account-b', 2);
    identity.resolve({
      result: {
        fullyqualifiedname: 'identity.name',
        identity: {primaryaddresses: ['RAccountAddress']},
      },
    });

    await expect(update).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(mockModifyServiceStoredDataForUser).not.toHaveBeenCalled();
    expect(mockUpdatePendingVerusIds).not.toHaveBeenCalled();
    expect(mockDispatchAddNotification).not.toHaveBeenCalled();
    expect(mockDispatchRemoveNotification).not.toHaveBeenCalled();
  });

  it('drops a provisioning response verified after switching from A to B', async () => {
    const verification = deferred();
    const setNotification = jest.fn();
    mockVerifyIdProvisioningResponse.mockReturnValueOnce(verification.promise);
    const requestContext = {
      sessionScope: {
        sessionScoped: true,
        accountHash: 'account-a',
        sessionEpoch: 1,
      },
    };

    const handling = handleProvisioningResponse(
      {id: 'VRSC'},
      {decision: {result: {}}},
      'provisioner',
      'notification-a',
      'identity-address',
      'identity.name',
      'signing-id',
      setNotification,
      requestContext,
    );
    await new Promise(resolve => setImmediate(resolve));
    expect(mockVerifyIdProvisioningResponse).toHaveBeenCalled();

    mockState = stateFor('account-b', 2);
    verification.resolve(true);

    await expect(handling).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(mockRequestServiceStoredData).not.toHaveBeenCalled();
    expect(mockUpdatePendingVerusIds).not.toHaveBeenCalled();
    expect(setNotification).not.toHaveBeenCalled();
  });
});
