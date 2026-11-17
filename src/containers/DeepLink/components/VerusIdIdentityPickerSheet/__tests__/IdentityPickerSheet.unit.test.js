/*
  Regression coverage for the shared VerusID picker:
   - the discovered candidate carries immutable origin metadata
   - a same-frame Back press cannot leave the link step while the child reports
     an in-flight mutation
   - a prefilled manual value opens the shared manual step
*/
import React from 'react';
import {act, create} from 'react-test-renderer';

const mockGetIdentitiesWithAddress = jest.fn();
const mockGetIdentity = jest.fn();
const mockStoreState = {
  authentication: {
    activeAccount: {
      accountHash: 'account-a',
      keys: {
        VRSCTEST: {
          vrpc: {addresses: ['RWalletAddress000000000000000000000000']},
        },
      },
    },
    sessionEpoch: 3,
  },
};

jest.mock('../../../../../store', () => ({
  __esModule: true,
  default: {getState: () => mockStoreState},
}));

jest.mock('../../../../../utils/api/channels/verusid/callCreators', () => ({
  getFriendlyNameMap: jest.fn(async () => ({})),
  getIdentitiesWithAddress: (...args) =>
    mockGetIdentitiesWithAddress(...args),
  getIdentity: (...args) => mockGetIdentity(...args),
}));

jest.mock('react-redux', () => ({
  useSelector: extractor => extractor(mockStoreState),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
  SafeAreaProvider: ({children}) => children,
  SafeAreaView: ({children}) => children,
}));

const {AccessibilityInfo} = require('react-native');

if (AccessibilityInfo) {
  AccessibilityInfo.isReduceMotionEnabled = jest.fn(() =>
    Promise.resolve(false),
  );
  AccessibilityInfo.addEventListener = jest.fn(() => ({remove: jest.fn()}));
}

jest.mock(
  'react-native-vector-icons/MaterialCommunityIcons',
  () => 'MaterialCommunityIcons',
);
jest.mock('lottie-react-native', () => 'LottieView');
jest.mock('react-native-svg', () => {
  const ReactModule = require('react');
  const stub = name => props =>
    ReactModule.createElement(name, props, props.children);

  return {
    __esModule: true,
    default: stub('Svg'),
    Defs: stub('Defs'),
    LinearGradient: stub('LinearGradient'),
    Rect: stub('Rect'),
    Stop: stub('Stop'),
  };
});
jest.mock('lucide-react-native', () => {
  const ReactModule = require('react');
  const stub = name => props => ReactModule.createElement(name, props);

  return {
    BadgePlus: stub('BadgePlus'),
    Check: stub('Check'),
    ChevronLeft: stub('ChevronLeft'),
    Link2: stub('Link2'),
    Pencil: stub('Pencil'),
    Plus: stub('Plus'),
  };
});
jest.mock('../../../../../components/BottomSheetModal', () => {
  const ReactModule = require('react');

  return props =>
    props.visible
      ? ReactModule.createElement(
          'BottomSheetModal',
          {onClose: props.onClose},
          props.children,
        )
      : null;
});
jest.mock('../../../../../components/SkeletonLoader', () => {
  const ReactModule = require('react');
  const stub = name => props =>
    ReactModule.createElement(name, props, props.children);

  return {
    __esModule: true,
    default: stub('SkeletonLoader'),
    SkeletonBlock: stub('SkeletonBlock'),
    SkeletonSection: stub('SkeletonSection'),
  };
});

const IdentityPickerSheet = require('../IdentityPickerSheet').default;
const {
  VERUSID_SHEET_MODES,
} = require('../IdentityPickerSheet');

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const baseProps = {
  visible: true,
  coinObj: {id: 'VRSCTEST', system_id: 'iSystemId'},
  isCandidateAllowed: () => true,
  linkedIds: {},
  sortedIds: {},
  isIdentityAllowed: () => false,
  selectedIdentity: null,
  initialMode: VERUSID_SHEET_MODES.LINK,
  onClose: jest.fn(),
  onLinkCandidate: jest.fn(),
  onSelect: jest.fn(),
};

const findBackButton = renderer =>
  renderer.root.findAll(
    node =>
      node.props?.accessibilityLabel === 'Back to VerusID options',
  )[0];

const findSheetClose = renderer =>
  renderer.root.findAll(node => node.type === 'BottomSheetModal')[0]?.props
    ?.onClose;

describe('IdentityPickerSheet link step', () => {
  beforeEach(() => {
    mockGetIdentitiesWithAddress.mockReset();
    mockGetIdentity.mockReset();
  });

  it('carries origin metadata on a discovered candidate', async () => {
    mockGetIdentitiesWithAddress.mockResolvedValue({
      error: null,
      result: [{identityaddress: 'iAlice'}],
    });
    mockGetIdentity.mockResolvedValue({
      error: null,
      result: {
        fullyqualifiedname: 'alice.VRSCTEST@',
        identity: {
          identityaddress: 'iAlice',
          name: 'alice',
          primaryaddresses: ['RWalletAddress000000000000000000000000'],
        },
        status: 'active',
      },
    });
    const onLinkCandidate = jest.fn(() => new Promise(() => {}));
    let renderer;

    await act(async () => {
      renderer = create(
        <IdentityPickerSheet {...baseProps} onLinkCandidate={onLinkCandidate} />,
      );
    });
    await flush();

    const row = renderer.root.findAll(
      node =>
        typeof node.props?.onPress === 'function' &&
        node.props?.accessibilityRole === 'button' &&
        node.props?.accessibilityLabel?.includes('alice'),
    )[0];

    expect(row).toBeTruthy();

    await act(async () => {
      row.props.onPress();
    });

    expect(onLinkCandidate).toHaveBeenCalledTimes(1);
    const candidate = onLinkCandidate.mock.calls[0][0];
    expect(candidate.origin).toEqual({
      accountHash: 'account-a',
      chainId: 'VRSCTEST',
      sessionEpoch: 3,
      walletAddress: 'RWalletAddress000000000000000000000000',
    });
  });

  it('ignores a same-frame Back press while the child reports busy', async () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    mockGetIdentitiesWithAddress.mockResolvedValue({
      error: null,
      result: [{identityaddress: 'iAlice'}],
    });
    mockGetIdentity.mockResolvedValue({
      error: null,
      result: {
        fullyqualifiedname: 'alice.VRSCTEST@',
        identity: {
          identityaddress: 'iAlice',
          name: 'alice',
          primaryaddresses: ['RWalletAddress000000000000000000000000'],
        },
        status: 'active',
      },
    });
    const onLinkCandidate = jest.fn(() => new Promise(() => {}));
    let renderer;

    await act(async () => {
      renderer = create(
        <IdentityPickerSheet
          {...baseProps}
          onClose={onClose}
          onLinkCandidate={onLinkCandidate}
        />,
      );
    });
    await flush();

    const row = renderer.root.findAll(
      node =>
        typeof node.props?.onPress === 'function' &&
        node.props?.accessibilityRole === 'button' &&
        node.props?.accessibilityLabel?.includes('alice'),
    )[0];

    const backButton = findBackButton(renderer);
    expect(backButton).toBeTruthy();

    await act(async () => {
      // Both presses happen in the same frame, before React commits the
      // child's busy state. Only the synchronous ref can block the transition.
      row.props.onPress();
      backButton.props.onPress();
      jest.advanceTimersByTime(1000);
    });
    await flush();

    // Still on the link step: the child's in-flight loading state is rendered
    // and the Back affordance has not been removed by a mode transition.
    const linkLoadingLabels = renderer.root.findAll(
      node => node.props?.children === 'Linking VerusID',
    );
    expect(linkLoadingLabels.length).toBeGreaterThan(0);
    expect(findBackButton(renderer)).toBeTruthy();

    // The backdrop/system close is also blocked while the link is in flight.
    const sheetClose = findSheetClose(renderer);
    expect(typeof sheetClose).toBe('function');
    await act(async () => {
      sheetClose();
    });
    expect(onClose).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('opens the shared manual step with a prefilled value', async () => {
    mockGetIdentitiesWithAddress.mockResolvedValue({
      error: null,
      result: [],
    });
    let renderer;

    await act(async () => {
      renderer = create(
        <IdentityPickerSheet
          {...baseProps}
          initialManualValue="alice.VRSCTEST@"
        />,
      );
    });
    await flush();

    const input = renderer.root.findAll(
      node => node.props?.accessibilityLabel === 'VerusID name or i-Address',
    )[0];

    expect(input).toBeTruthy();
    expect(input.props.value).toBe('alice.VRSCTEST@');
  });
});
