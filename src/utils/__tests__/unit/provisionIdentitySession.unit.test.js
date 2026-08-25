let mockState;
const mockStoreDispatch = jest.fn();
const mockGetIdentity = jest.fn();
const mockGetVdxfId = jest.fn();
const mockSignProvisioningRequest = jest.fn();
const mockAxiosPost = jest.fn();
const mockHandleProvisioningResponse = jest.fn();

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    dispatch: mockStoreDispatch,
    getState: jest.fn(() => mockState),
  },
}));

jest.mock('react-redux', () => ({
  connect: () => Component => Component,
}));

jest.mock('@bitgo/utxo-lib/dist/src/address', () => ({
  fromBase58Check: jest.fn(() => {
    throw new Error('not an i-address');
  }),
}));

jest.mock('verusid-ts-client', () => ({
  primitives: {
    LOGIN_CONSENT_ID_PROVISIONING_WEBHOOK_VDXF_KEY: {vdxfid: 'webhook'},
    LoginConsentRequest: class LoginConsentRequest {},
    LoginConsentProvisioningChallenge: class LoginConsentProvisioningChallenge {
      constructor(value) {
        Object.assign(this, value);
      }
    },
    LoginConsentProvisioningRequest: class LoginConsentProvisioningRequest {
      constructor(value) {
        Object.assign(this, value);
      }
    },
  },
}));

jest.mock('../../api/channels/verusid/callCreators', () => ({
  getIdentity: mockGetIdentity,
}));

jest.mock('../../api/channels/vrpc/requests/getVdxfid', () => ({
  getVdxfId: mockGetVdxfId,
}));

jest.mock('../../api/channels/vrpc/requests/signIdProvisioningRequest', () => ({
  signIdProvisioningRequest: mockSignProvisioningRequest,
}));

jest.mock('../../api/channels/vrpc/requests/handleProvisioningResponse', () => ({
  handleProvisioningResponse: mockHandleProvisioningResponse,
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {post: mockAxiosPost},
}));

jest.mock('../../notification', () => ({
  LoadingNotification: class LoadingNotification {
    constructor() {
      this.uid = 'notification-id';
    }
  },
}));

jest.mock('../../../actions/actions/notifications/dispatchers/notifications', () => ({
  dispatchAddNotification: jest.fn(),
}));

jest.mock(
  '../../../components/SendModal/ProvisionIdentity/ProvisionIdentityConfirm/ProvisionIdentityConfirm.render',
  () => ({ProvisionIdentityConfirmRender: jest.fn()}),
);

jest.mock('react-native', () => ({Alert: {alert: jest.fn()}}));

const {
  SEND_MODAL_IDENTITY_TO_PROVISION_FIELD,
} = require('../../constants/sendModal');
const {
  OPEN_SEND_COIN_MODAL,
  SIGN_OUT,
} = require('../../constants/storeType');
const {
  openSendModal,
} = require('../../../actions/actions/sendModal/dispatchers/sendModal');
const {sendModal} = require('../../../reducers/sendModal');
const {
  ProvisionIdentityConfirm,
} = require('../../../components/SendModal/ProvisionIdentity/ProvisionIdentityConfirm/ProvisionIdentityConfirm');

const stateFor = (accountHash, sessionEpoch, requestId = 'modal-a') => ({
  authentication: {
    activeAccount: {id: accountHash, accountHash},
    sessionEpoch,
  },
  sendModal: {requestId},
});

const deferred = () => {
  let resolve;
  const promise = new Promise(promiseResolve => {
    resolve = promiseResolve;
  });
  return {promise, resolve};
};

const flush = () => new Promise(resolve => setImmediate(resolve));

const makeProps = () => ({
  route: {
    params: {
      primaryAddress: 'RPrimary',
      provAddress: null,
      provSystemId: {data: 'system-id'},
      provFqn: null,
      provParent: {data: 'parent-id'},
      provWebhook: {data: 'https://provision.example'},
      friendlyNameMap: {},
    },
  },
  sendModal: {
    requestId: 'modal-a',
    sessionScope: {
      sessionScoped: true,
      accountHash: 'account-a',
      sessionEpoch: 1,
    },
    coinObj: {id: 'VRSC', system_id: 'system-id'},
    data: {
      [SEND_MODAL_IDENTITY_TO_PROVISION_FIELD]: 'alice',
      provisioningRequestType: 'generic',
      provisioningRequestID: 'challenge-id',
      provisioningRequestBufferString: 'request-buffer',
      provisioningSignerId: 'signer-id',
      provisioningRequestHasResponseUris: false,
      fromService: false,
    },
  },
  navigation: {navigate: jest.fn()},
  setLoading: jest.fn(() => Promise.resolve()),
  setPreventExit: jest.fn(() => Promise.resolve()),
  setModalHeight: jest.fn(),
});

describe('provision identity session isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = stateFor('account-a', 1);
    mockGetIdentity.mockReset();
    mockGetIdentity
      .mockResolvedValueOnce({
        result: {
          fullyqualifiedname: 'parent.name',
          identity: {name: 'parent'},
        },
      })
      .mockResolvedValueOnce({result: {identity: {name: 'provisioner'}}});
    mockGetVdxfId.mockResolvedValue({result: {vdxfid: 'identity-id'}});
    mockSignProvisioningRequest.mockResolvedValue({signed: true});
    mockAxiosPost.mockResolvedValue({data: {decision: 'accepted'}});
    mockHandleProvisioningResponse.mockResolvedValue();
  });

  it('stores modal provenance when opened and removes it on sign-out', () => {
    openSendModal(
      'Provision',
      {id: 'VRSC'},
      {id: 'vrpc'},
      {request: 'account-a-data'},
      'provision',
      null,
      'confirm',
    );

    expect(mockStoreDispatch).toHaveBeenCalledTimes(1);
    const openAction = mockStoreDispatch.mock.calls[0][0];
    expect(openAction).toEqual(
      expect.objectContaining({
        type: OPEN_SEND_COIN_MODAL,
        payload: expect.objectContaining({
          requestId: expect.stringMatching(/^send-modal-/),
          sessionScope: {
            sessionScoped: true,
            accountHash: 'account-a',
            sessionEpoch: 1,
          },
        }),
      }),
    );

    const openedState = sendModal(undefined, openAction);
    expect(openedState.requestId).toBe(openAction.payload.requestId);
    expect(openedState.sessionScope).toEqual(openAction.payload.sessionScope);

    expect(sendModal(openedState, {type: SIGN_OUT})).toEqual(
      expect.objectContaining({
        visible: false,
        requestId: null,
        sessionScope: null,
        data: {},
      }),
    );
  });

  it('does not request a signing key after an identity lookup crosses sessions', async () => {
    const lookup = deferred();
    mockGetIdentity.mockReset().mockReturnValueOnce(lookup.promise);
    const props = makeProps();
    const component = new ProvisionIdentityConfirm(props);
    const submission = component.submitData();

    await flush();
    expect(mockGetIdentity).toHaveBeenCalled();
    mockState = stateFor('account-b', 2);
    lookup.resolve({
      result: {fullyqualifiedname: 'parent.name', identity: {name: 'parent'}},
    });
    await submission;

    expect(mockSignProvisioningRequest).not.toHaveBeenCalled();
    expect(mockAxiosPost).not.toHaveBeenCalled();
    expect(props.setPreventExit).toHaveBeenCalledTimes(1);
    expect(props.setPreventExit).toHaveBeenCalledWith(true);
    expect(props.setLoading).toHaveBeenCalledTimes(1);
    expect(props.setLoading).toHaveBeenCalledWith(true);
  });

  it('does not submit a modal that originated in a previous account session', async () => {
    const props = makeProps();
    const component = new ProvisionIdentityConfirm(props);
    mockState = stateFor('account-b', 2);

    await component.submitData();

    expect(props.setLoading).not.toHaveBeenCalled();
    expect(props.setPreventExit).not.toHaveBeenCalled();
    expect(mockGetIdentity).not.toHaveBeenCalled();
    expect(mockSignProvisioningRequest).not.toHaveBeenCalled();
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it('does not let a superseded modal clear or submit the current modal', async () => {
    const lookup = deferred();
    mockGetIdentity.mockReset().mockReturnValueOnce(lookup.promise);
    const props = makeProps();
    const component = new ProvisionIdentityConfirm(props);
    const submission = component.submitData();

    await flush();
    mockState = stateFor('account-a', 1, 'modal-b');
    lookup.resolve({
      result: {fullyqualifiedname: 'parent.name', identity: {name: 'parent'}},
    });
    await submission;

    expect(mockSignProvisioningRequest).not.toHaveBeenCalled();
    expect(mockAxiosPost).not.toHaveBeenCalled();
    expect(props.setPreventExit).toHaveBeenCalledTimes(1);
    expect(props.setPreventExit).toHaveBeenCalledWith(true);
    expect(props.setLoading).toHaveBeenCalledTimes(1);
    expect(props.setLoading).toHaveBeenCalledWith(true);
  });

  it('binds signing to the originating session and checks it before POST', async () => {
    const signing = deferred();
    mockSignProvisioningRequest.mockReturnValueOnce(signing.promise);
    const props = makeProps();
    const component = new ProvisionIdentityConfirm(props);
    const submission = component.submitData();

    await flush();
    expect(mockSignProvisioningRequest).toHaveBeenCalledWith(
      expect.objectContaining({id: 'VRSC'}),
      expect.any(Object),
      {
        modalRequestId: 'modal-a',
        sessionScope: {
          sessionScoped: true,
          accountHash: 'account-a',
          sessionEpoch: 1,
        },
      },
    );

    mockState = stateFor('account-b', 2);
    signing.resolve({signed: true});
    await submission;

    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it('posts and handles the response only while the originating session remains current', async () => {
    const props = makeProps();
    const component = new ProvisionIdentityConfirm(props);

    await component.submitData();

    expect(mockAxiosPost).toHaveBeenCalledWith(
      'https://provision.example',
      {signed: true},
    );
    expect(mockHandleProvisioningResponse).toHaveBeenCalledWith(
      expect.objectContaining({id: 'VRSC'}),
      {decision: 'accepted'},
      'request-buffer',
      false,
      'provisioner',
      'notification-id',
      'identity-id',
      'alice.parent.name',
      expect.any(Function),
      'generic',
      'signer-id',
      null,
      {
        modalRequestId: 'modal-a',
        sessionScope: {
          sessionScoped: true,
          accountHash: 'account-a',
          sessionEpoch: 1,
        },
      },
    );
  });
});
