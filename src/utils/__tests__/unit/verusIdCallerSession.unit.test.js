let mockState;
const mockDispatch = jest.fn();
const mockLinkVerusId = jest.fn();
const mockUnlinkVerusId = jest.fn();
const mockUpdateVerusIdWallet = jest.fn();
const mockSetUserCoins = jest.fn((activeCoinList, accountId) => ({
  type: 'SET_USER_COINS',
  payload: {activeCoinList, accountId, activeCoinsForUser: []},
}));
const mockSetServiceLoading = jest.fn((loading, service) => ({
  type: 'SET_SERVICE_LOADING',
  payload: {loading, service},
}));
const mockLinkRender = jest.fn(args => args);

jest.mock('react', () => {
  class Component {
    constructor(props) {
      this.props = props;
      this.state = {};
    }

    setState(update, callback) {
      const next = typeof update === 'function' ? update(this.state) : update;
      this.state = {...this.state, ...next};
      if (callback) callback();
    }
  }

  return {
    __esModule: true,
    default: {},
    Component,
    useCallback: callback => callback,
    useState: initial => [initial, jest.fn()],
  };
});

jest.mock('react-redux', () => ({
  connect: () => Component => Component,
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(() => mockState),
  },
}));

jest.mock('../../../hooks/useObjectSelector', () => ({
  useObjectSelector: selector => selector(mockState),
}));

jest.mock('../../../actions/actionCreators', () => ({
  setServiceLoading: mockSetServiceLoading,
  setUserCoins: mockSetUserCoins,
}));

jest.mock(
  '../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager',
  () => ({updateVerusIdWallet: mockUpdateVerusIdWallet}),
);

jest.mock(
  '../../../actions/actions/services/dispatchers/verusid/verusid',
  () => ({
    linkVerusId: mockLinkVerusId,
    unlinkVerusId: mockUnlinkVerusId,
  }),
);

jest.mock(
  '../../../actions/actions/intervals/dispatchers/lifecycleManager',
  () => ({
    clearChainLifecycle: jest.fn(),
    refreshActiveChainLifecycles: jest.fn(),
  }),
);

jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({
  createAlert: jest.fn(),
  resolveAlert: jest.fn(),
}));

jest.mock('../../api/channels/verusid/callCreators', () => ({
  getFriendlyNameMap: jest.fn(),
  getIdentity: jest.fn(),
}));

jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: {
    findCoinObj: jest.fn(() => ({id: 'VRSC'})),
    getBasicCoinObj: jest.fn(() => ({system_id: 'vrsc-system'})),
  },
}));

jest.mock(
  '../../../components/SendModal/LinkIdentity/LinkIdentityConfirm/LinkIdentityConfirm.render',
  () => ({LinkIdentityConfirmRender: mockLinkRender}),
);

jest.mock(
  '../../../containers/Services/ServiceComponents/VerusIdService/VerusIdServiceOverview/VerusIdServiceOverview.render',
  () => ({VerusIdServiceOverviewRender: jest.fn()}),
);

jest.mock('react-native', () => ({Alert: {alert: jest.fn()}}));

const {
  LinkIdentityConfirm,
} = require('../../../components/SendModal/LinkIdentity/LinkIdentityConfirm/LinkIdentityConfirm');
const {
  VerusIdServiceOverview,
} = require('../../../containers/Services/ServiceComponents/VerusIdService/VerusIdServiceOverview/VerusIdServiceOverview');

const stateFor = (id, accountHash, sessionEpoch) => ({
  authentication: {
    activeAccount: {id, accountHash},
    sessionEpoch,
  },
  coins: {activeCoinList: [{id: 'VRSC'}]},
  sendModal: {coinObj: {id: 'VRSC'}},
});

const deferred = () => {
  let resolve;
  const promise = new Promise(promiseResolve => {
    resolve = promiseResolve;
  });
  return {promise, resolve};
};

describe('VerusID caller session isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = stateFor('alice', 'account-a', 1);
  });

  it('does not link into account B when the account changes during modal setup', async () => {
    const loading = deferred();
    const props = {
      route: {
        params: {
          friendlyNames: {},
          ownedByUser: true,
          verusId: {
            fullyqualifiedname: 'alice.identity',
            identity: {identityaddress: 'iAlice'},
          },
        },
      },
      navigation: {navigate: jest.fn()},
      setLoading: jest.fn(value => value ? loading.promise : Promise.resolve()),
      setModalHeight: jest.fn(),
      setPreventExit: jest.fn(() => Promise.resolve()),
    };
    const rendered = LinkIdentityConfirm(props);
    const submission = rendered.submitData();

    expect(props.setLoading).toHaveBeenCalledWith(true);
    mockState = stateFor('bob', 'account-b', 2);
    loading.resolve();
    await submission;

    expect(mockLinkVerusId).not.toHaveBeenCalled();
    expect(mockUpdateVerusIdWallet).not.toHaveBeenCalled();
  });

  it('does not refresh account B after an account-A link finishes', async () => {
    const linking = deferred();
    mockLinkVerusId.mockReturnValueOnce(linking.promise);
    const props = {
      route: {
        params: {
          friendlyNames: {},
          ownedByUser: true,
          verusId: {
            fullyqualifiedname: 'alice.identity',
            identity: {identityaddress: 'iAlice'},
          },
        },
      },
      navigation: {navigate: jest.fn()},
      setLoading: jest.fn(() => Promise.resolve()),
      setModalHeight: jest.fn(),
      setPreventExit: jest.fn(() => Promise.resolve()),
    };
    const rendered = LinkIdentityConfirm(props);
    const submission = rendered.submitData();

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(mockLinkVerusId).toHaveBeenCalledWith(
      'iAlice',
      'alice.identity',
      'VRSC',
      expect.objectContaining({
        sessionScope: expect.objectContaining({accountHash: 'account-a'}),
      }),
    );
    mockState = stateFor('bob', 'account-b', 2);
    linking.resolve();
    await submission;

    expect(mockUpdateVerusIdWallet).not.toHaveBeenCalled();
    expect(mockSetUserCoins).not.toHaveBeenCalled();
  });

  it('does not unlink from account B after an account-A confirmation', async () => {
    const confirmation = deferred();
    const instance = new VerusIdServiceOverview({
      activeAccount: {id: 'alice', accountHash: 'account-a'},
      activeCoinList: [{id: 'VRSC'}],
      dispatch: mockDispatch,
    });
    instance.closeVerusIdDetailsModal = jest.fn();
    instance.canUnlinkIdentity = jest.fn(() => confirmation.promise);

    const unlinking = instance.tryUnlinkIdentity('iAlice', 'VRSC');
    mockState = stateFor('bob', 'account-b', 2);
    confirmation.resolve(true);
    await unlinking;

    expect(mockUnlinkVerusId).not.toHaveBeenCalled();
    expect(mockUpdateVerusIdWallet).not.toHaveBeenCalled();
    expect(mockSetServiceLoading).not.toHaveBeenCalled();
  });

  it('does not refresh account B after an account-A unlink finishes', async () => {
    const unlinkingRequest = deferred();
    mockUnlinkVerusId.mockReturnValueOnce(unlinkingRequest.promise);
    const instance = new VerusIdServiceOverview({
      activeAccount: {id: 'alice', accountHash: 'account-a'},
      activeCoinList: [{id: 'VRSC'}],
      dispatch: mockDispatch,
    });

    const unlinking = instance.unlinkIdentity('iAlice', 'VRSC');
    expect(mockUnlinkVerusId).toHaveBeenCalledWith(
      'iAlice',
      'VRSC',
      expect.objectContaining({
        sessionScope: expect.objectContaining({accountHash: 'account-a'}),
        accountId: 'alice',
      }),
    );
    mockState = stateFor('bob', 'account-b', 2);
    unlinkingRequest.resolve();
    await unlinking;

    expect(mockUpdateVerusIdWallet).not.toHaveBeenCalled();
    expect(mockSetUserCoins).not.toHaveBeenCalled();
  });
});
