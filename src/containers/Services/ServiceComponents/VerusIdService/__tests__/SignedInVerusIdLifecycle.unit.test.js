/*
  Regression coverage for two reproduced ID-1 lifecycle defects:

  1. The unlink confirmation queues `navigation.goBack()` behind the sheet's
     close animation. The delayed callback must validate against the exact
     session scope that began the unlink, not the scope of the current render,
     or a rerender/session change lets the old callback navigate.
  2. A READY resume that never settles must not permanently lock the
     component. A session/epoch change has to release the single-flight gate
     for the new session while stale completions stay inert.

  Both cases exercise the real production handlers through a rendered
  component with deferred promises rather than a source-shape assertion.
*/
import React from 'react';
import {act, create} from 'react-test-renderer';

let mockState;

const mockGetIdentity = jest.fn();
const mockGetFriendlyNameMap = jest.fn();
const mockUnlinkVerusId = jest.fn();
const mockUpdateVerusIdWallet = jest.fn();
const mockClearChainLifecycle = jest.fn();
const mockRefreshActiveChainLifecycles = jest.fn();
const mockSetUserCoins = jest.fn(activeCoins => ({
  type: 'SET_USER_COINS',
  payload: {activeCoinsForUser: activeCoins},
}));
const mockProcessVerusId = jest.fn();
const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
let mockHeaderRight = null;

const buildNavigation = () => ({
  addListener: () => () => {},
  goBack: mockGoBack,
  setOptions: options => {
    if (options && typeof options.headerRight === 'function') {
      mockHeaderRight = options.headerRight;
    }
  },
  getState: () => ({index: 1, routes: [{key: 'list'}, {key: 'details'}]}),
  isFocused: () => true,
});
const buildRoute = () => ({
  key: 'details',
  params: {
    chain: 'VRSCTEST',
    iAddress: 'iAlice',
    displayName: 'alice.VRSCTEST@',
  },
});

// Captures the sheet's own onClosed handler so the test can drive the real
// dismissal lifecycle, including the queued navigation callback.
let sheetOnClosed = null;

jest.mock('../../../../../store', () => ({
  __esModule: true,
  default: {getState: () => mockState, subscribe: () => () => {}, dispatch: jest.fn()},
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (extractor) => extractor(mockState),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: () => {},
  useNavigation: () => buildNavigation(),
  useRoute: () => buildRoute(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
  SafeAreaView: ({children}) => children,
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MCIcon');
jest.mock('../../../../../images/customIcons', () => ({
  Open: 'Open',
  Approved: 'Approved',
  Pending: 'Pending',
  Email: 'Email',
  Phone: 'Phone',
  User: 'User',
  File: 'File',
  Bank: 'Bank',
  BankBuilding: 'BankBuilding',
  BankMain: 'BankMain',
  Address: 'Address',
  Home: 'Home',
  Buy: 'Buy',
  Sell: 'Sell',
  Calendar: 'Calendar',
  Verus: 'Verus',
  BankBuildingBlack: 'BankBuildingBlack',
  Revoke: 'Revoke',
  Recover: 'Recover',
  Coins: 'Coins',
  TransactionLogos: 'TransactionLogos',
}));
jest.mock('lottie-react-native', () => 'LottieView');
jest.mock('lucide-react-native', () => ({
  Check: 'Check',
  Copy: 'Copy',
  ExternalLink: 'ExternalLink',
  Pencil: 'Pencil',
  Plus: 'Plus',
}));
jest.mock(
  '../../../../../containers/DeepLink/components/VerusIdIdentityPickerSheet/LinkExistingVerusIdSheet',
  () => ({
    __esModule: true,
    default: () => null,
    LINK_EXISTING_VERUSID_SHEET_MODES: {LIST: 'list', MANUAL: 'manual'},
  }),
);
jest.mock('react-native-svg', () => {
  const RN = require('react');
  const stub = name => props => RN.createElement(name, props, props.children);
  return {
    __esModule: true,
    default: stub('Svg'),
    Defs: stub('Defs'),
    LinearGradient: stub('LinearGradient'),
    Rect: stub('Rect'),
    Stop: stub('Stop'),
  };
});

jest.mock('../../../../../components/BottomSheetModal', () => {
  const RN = require('react');
  return props => {
    if (!props.visible) return null;
    sheetOnClosed = props.onClosed;
    return RN.createElement(
      'BottomSheetModal',
      {onClose: props.onClose},
      props.children,
    );
  };
});

jest.mock('../../../../../components/AppButton', () => {
  const RN = require('react');
  return ({accessibilityLabel, disabled, onPress, children}) =>
    RN.createElement(
      'AppButton',
      {accessibilityLabel, disabled, onPress},
      children,
    );
});

jest.mock('../../../../../components/SkeletonLoader', () => {
  const RN = require('react');
  const stub = name => props => RN.createElement(name, props, props.children);
  return {
    __esModule: true,
    default: stub('SkeletonLoader'),
    SkeletonBlock: stub('SkeletonBlock'),
    SkeletonSection: stub('SkeletonSection'),
  };
});

jest.mock('../../../../../utils/CoinData/CoinDirectory', () => ({
  CoinDirectory: {
    getBasicCoinObj: () => ({system_id: 'iVRSCTEST'}),
    findCoinObj: () => ({id: 'VRSCTEST', system_id: 'iVRSCTEST'}),
  },
}));

jest.mock('../../../../../utils/api/channels/vrpc/requests/getInfo', () => ({
  getInfo: () => Promise.resolve({result: {longestchain: 100}}),
}));

jest.mock('../../../../../utils/api/channels/verusid/callCreators', () => ({
  getIdentity: (...args) => mockGetIdentity(...args),
  getFriendlyNameMap: (...args) => mockGetFriendlyNameMap(...args),
}));

jest.mock(
  '../../../../../actions/actions/services/dispatchers/verusid/verusid',
  () => ({
    unlinkVerusId: (...args) => mockUnlinkVerusId(...args),
    linkVerusId: jest.fn(),
    checkVerusIdNotificationsForUpdates: jest.fn(),
    deleteProvisionedIds: jest.fn(),
  }),
);

jest.mock(
  '../../../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager',
  () => ({
    updateVerusIdWallet: (...args) => mockUpdateVerusIdWallet(...args),
    updatePendingVerusIds: jest.fn(),
  }),
);

jest.mock(
  '../../../../../actions/actions/intervals/dispatchers/lifecycleManager',
  () => ({
    clearChainLifecycle: (...args) => mockClearChainLifecycle(...args),
    refreshActiveChainLifecycles: (...args) =>
      mockRefreshActiveChainLifecycles(...args),
  }),
);

jest.mock('../../../../../actions/actionCreators', () => ({
  setUserCoins: (...args) => mockSetUserCoins(...args),
  setServiceLoading: jest.fn(() => ({type: 'SET_SERVICE_LOADING'})),
}));

jest.mock('../../../../../theme/onboarding', () => ({
  useOnboardingTheme: () => mockTheme,
}));

jest.mock('../../../../../utils/linking', () => ({openUrl: jest.fn()}));

jest.mock('../../../../../components/VerusIdObjectData', () => {
  const RN = require('react');
  return {
    __esModule: true,
    default: props =>
      RN.createElement('VerusIdObjectData', {
        'data-verusId': props.verusId?.identity?.identityaddress,
      }),
    VERUSID_OBJECT_DATA_PRESENTATIONS: {SIGNED_IN_DETAILS: 'signedInDetails'},
  };
});

jest.mock('../VerusIdLogin', () => ({
  processVerusId: (...args) => mockProcessVerusId(...args),
}));

const mockTheme = {
  mode: 'light',
  isDark: false,
  spacing: {xs: 4, sm: 8, md: 16, lg: 24, xl: 32},
  rounded: {sm: 8, md: 12, lg: 18, xl: 24, full: 9999},
  colors: {
    primary: '#3165D4',
    onPrimary: '#FFFFFF',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceMuted: '#F3F5F8',
    surfaceRaised: '#FBFCFE',
    textPrimary: '#111827',
    textSecondary: '#4B5565',
    textSubtle: '#8E939B',
    border: '#E7ECF2',
    danger: '#F22D37',
    shadow: '#000000',
  },
  typography: new Proxy(
    {},
    {get: () => ({fontSize: 14, lineHeight: 20})},
  ),
};

const buildActiveAccount = (sessionEpoch, accountHash = 'account-a') => ({
  id: 'account-1',
  accountHash,
  keys: {
    VRSCTEST: {
      vrpc: {addresses: ['RWalletAddress000000000000000000000000']},
    },
  },
  sessionEpoch,
});

const setSession = ({accountHash = 'account-a', sessionEpoch = 1} = {}) => {
  mockState = {
    authentication: {
      activeAccount: buildActiveAccount(sessionEpoch, accountHash),
      sessionEpoch,
    },
    coins: {activeCoinList: ['VRSCTEST'], activeCoinsForUser: []},
    coinMenus: {allSubWallets: {}},
    errors: {},
    ledger: {balances: {}},
    channelStore_verusid: {pendingIds: {}},
  };
};

// Minimal pending-request shape the service's normalize + READY-row path needs.
const readyPendingDetails = {
  fqn: 'ready.VRSCTEST@',
  fromService: 'generic',
  requestType: 'generic',
  hasResponseUris: true,
  loginRequest: 'payload',
  status: 'NOTIFICATION_TYPE_VERUSID_READY',
};

// Mirrors the real store: a wallet session/epoch change does not erase the
// persisted pending-request list, so the new session still renders the READY
// row and can attempt its own resume.
const setSessionWithPending = (session) => {
  setSession(session);
  mockState.channelStore_verusid = {
    pendingIds: {VRSCTEST: {iReady: {...readyPendingDetails}}},
  };
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const SignedInVerusIdDetails =
  require('../SignedInVerusIdDetails').default;
const SignedInVerusIdService =
  require('../SignedInVerusIdService').default;

describe('SignedInVerusIdDetails unlink dismissal lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sheetOnClosed = null;
    setSession({sessionEpoch: 1});
    mockGetIdentity.mockResolvedValue({
      error: null,
      result: {
        fullyqualifiedname: 'alice.VRSCTEST@',
        identity: {
          identityaddress: 'iAlice',
          name: 'alice',
          primaryaddresses: [],
        },
      },
    });
    mockGetFriendlyNameMap.mockResolvedValue({});
    mockUnlinkVerusId.mockResolvedValue(undefined);
    mockUpdateVerusIdWallet.mockResolvedValue(undefined);
  });

  const renderDetails = async () => {
    let renderer;
    await act(async () => {
      renderer = create(<SignedInVerusIdDetails />);
    });
    await flush();
    return renderer;
  };

  const findByLabel = (renderer, label) =>
    renderer.root.findAll(
      node => node.props?.accessibilityLabel === label,
    )[0];

  // The unlink header action is installed through navigation.setOptions, so it
  // is rendered into its own probe tree to exercise the real button handler.
  const renderHeader = async () => {
    expect(typeof mockHeaderRight).toBe('function');
    const HeaderActions = () => mockHeaderRight();
    let renderer;
    await act(async () => {
      renderer = create(<HeaderActions />);
    });
    return renderer;
  };

  // Drives a real successful unlink up to the point where the navigation
  // callback is queued behind the sheet's close animation. Unlink sits in the
  // ⋯ options sheet, which runs the action after it has finished closing.
  const startUnlink = async (renderer, header) => {
    await act(async () => {
      // Pressing the header action updates the details renderer's state, so
      // flush both trees inside the same act boundary.
      findByLabel(header, 'VerusID options').props.onPress();
      await Promise.resolve();
    });
    await flush();
    await act(async () => {
      findByLabel(renderer, 'Unlink VerusID').props.onPress();
    });
    await act(async () => {
      sheetOnClosed();
    });
    await flush();
    expect(typeof sheetOnClosed).toBe('function');
    expect(findByLabel(renderer, 'Unlink alice.VRSCTEST@')).toBeTruthy();

    await act(async () => {
      findByLabel(renderer, 'Unlink alice.VRSCTEST@').props.onPress();
    });
    await flush();
  };

  it('navigates after the close animation while the unlink-start session is current', async () => {
    const renderer = await renderDetails();
    const header = await renderHeader();

    await startUnlink(renderer, header);

    await act(async () => {
      sheetOnClosed();
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not navigate when the rendered session moved on before the queued callback', async () => {
    const renderer = await renderDetails();
    const header = await renderHeader();

    await startUnlink(renderer, header);

    // The account/session changed mid-dismissal. Even if a rerender replaced
    // the rendered scope with epoch 2, the queued callback must keep validating
    // against the epoch-1 scope that began this unlink.
    setSession({sessionEpoch: 2});
    await act(async () => {
      renderer.update(<SignedInVerusIdDetails />);
    });
    await flush();

    await act(async () => {
      sheetOnClosed();
    });

    expect(mockGoBack).not.toHaveBeenCalled();
  });
});

describe('SignedInVerusIdService READY resume ownership', () => {
  const buildController = () => ({
    state: {linkedIds: {}},
    props: {
      activeAccount: {
        id: 'account-1',
        accountHash: 'account-a',
        testnetOverrides: {},
      },
      loading: false,
      navigation: buildNavigation(),
    },
    getLinkedIds: jest.fn(),
  });

  const renderService = async (controller) => {
    let renderer;
    await act(async () => {
      renderer = create(<SignedInVerusIdService controller={controller} />);
    });
    await flush();
    return renderer;
  };

  // The row name is split into styled parts; its accessibility label keeps
  // the whole name.
  const findReadyRow = renderer =>
    renderer.root.findAll(
      node => node.props?.accessibilityLabel === 'ready.VRSCTEST@',
    )[0];

  // Walks up from the row's name to the row's own press target, which is the
  // TouchableOpacity the READY "Link"/"Link and login" action installs.
  const pressReadyRow = renderer => {
    let cursor = findReadyRow(renderer);
    while (cursor && typeof cursor.props?.onPress !== 'function') {
      cursor = cursor.parent;
    }
    expect(typeof cursor?.props?.onPress).toBe('function');
    cursor.props.onPress();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sheetOnClosed = null;
    setSessionWithPending({sessionEpoch: 1});
  });

  it('starts a READY action in the new session after an unresolved epoch-1 resume', async () => {
    let resolveSecond;
    mockProcessVerusId
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveSecond = resolve;
          }),
      );
    const controller = buildController();
    const renderer = await renderService(controller);

    const row = findReadyRow(renderer);
    expect(row).toBeTruthy();

    // Epoch-1 resume never settles and stays single-flight within its session.
    await act(async () => {
      pressReadyRow(renderer);
    });
    expect(mockProcessVerusId).toHaveBeenCalledTimes(1);
    await act(async () => {
      pressReadyRow(renderer);
    });
    expect(mockProcessVerusId).toHaveBeenCalledTimes(1);

    // A same-account epoch change must release the gate without the old run
    // settling, so the new session can start its own READY action.
    setSessionWithPending({sessionEpoch: 2});
    await act(async () => {
      renderer.update(<SignedInVerusIdService controller={controller} />);
    });
    await flush();

    await act(async () => {
      pressReadyRow(renderer);
    });
    expect(mockProcessVerusId).toHaveBeenCalledTimes(2);

    const guard = mockProcessVerusId.mock.calls[1][6];
    expect(guard()).toBe(true);

    await act(async () => {
      resolveSecond('dismissed');
    });
    await flush();
  });

  it('keeps stale epoch-1 completion inert after the new session starts', async () => {
    let rejectFirst;
    mockProcessVerusId
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockImplementationOnce(() => new Promise(() => {}));
    const controller = buildController();
    const renderer = await renderService(controller);

    await act(async () => {
      pressReadyRow(renderer);
    });
    const staleGuard = mockProcessVerusId.mock.calls[0][6];

    setSessionWithPending({sessionEpoch: 2});
    await act(async () => {
      renderer.update(<SignedInVerusIdService controller={controller} />);
    });
    await flush();

    await act(async () => {
      pressReadyRow(renderer);
    });
    expect(mockProcessVerusId).toHaveBeenCalledTimes(2);

    // The old run finally settles after the new session has started. Its guard
    // must be stale, so its fallback sheet must not open and it must not clear
    // the new session's single-flight gate.
    expect(staleGuard()).toBe(false);
    await act(async () => {
      rejectFirst(new Error('stale failure'));
    });
    await flush();

    // The stale rejection did not reopen the manual fallback sheet...
    expect(findByLabelNoThrow(renderer, 'VerusID name or i-Address')).toBeFalsy();

    // ...and the new session's run is still in flight, so a third tap is still
    // blocked by single-flight.
    await act(async () => {
      pressReadyRow(renderer);
    });
    expect(mockProcessVerusId).toHaveBeenCalledTimes(2);
  });
});

const findByLabelNoThrow = (renderer, label) =>
  renderer.root.findAll(node => node.props?.accessibilityLabel === label)[0];
