const mockModifyServiceStoredDataForUser = jest.fn();
const mockUpdatePendingVerusIds = jest.fn();
const mockDispatchAddNotification = jest.fn();
const mockDispatchRemoveNotification = jest.fn();
const mockRequestServiceStoredData = jest.fn();
const mockGetIdentity = jest.fn();
const mockVerifyIdProvisioningResponse = jest.fn();
let mockState;

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(() => mockState),
  },
}));

jest.mock(
  '../../../actions/actions/services/dispatchers/services',
  () => ({
    modifyServiceStoredDataForUser: mockModifyServiceStoredDataForUser,
  }),
);

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

jest.mock('../../api/channels/vrpc/requests/verifyIdProvisioningResponse', () => ({
  verifyIdProvisioningResponse: mockVerifyIdProvisioningResponse,
}));

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
} = require('../../../actions/actions/services/dispatchers/verusid/verusid');
const {
  handleProvisioningResponse,
} = require('../../api/channels/vrpc/requests/handleProvisioningResponse');

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
      'request-base64',
      false,
      'provisioner',
      'notification-a',
      'identity-address',
      'identity.name',
      setNotification,
      'loginconsent',
      'signing-id',
      false,
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
