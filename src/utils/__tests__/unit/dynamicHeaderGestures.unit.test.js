const mockDispatch = jest.fn();
let mockState;

jest.mock('react-redux', () => ({
  useSelector: selector => selector(mockState),
  useDispatch: () => mockDispatch,
}));
jest.mock('../../../actions/actionCreators', () => ({
  setCoinSubWallet: (chainTicker, subWallet) => ({
    type: 'select-sub-wallet',
    payload: {chainTicker, subWallet},
  }),
}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({}));
jest.mock('../../linking', () => ({}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {}}));
jest.mock('react-native-paper', () => {
  const React = require('react');
  const Card = props => React.createElement('Card', props, props.children);
  Card.Content = 'CardContent';
  return {Card, Paragraph: 'Paragraph', Text: 'Text', IconButton: 'IconButton', Button: 'Button'};
});
// Keep the installed gesture builders and their execution policy real. Only
// replace the detector's native attachment boundary with a rendered host node.
jest.mock('react-native-gesture-handler', () => ({
  Gesture: require('react-native-gesture-handler/lib/commonjs/handlers/gestures/gestureObjects').GestureObjects,
  Directions: require('react-native-gesture-handler/lib/commonjs/Directions').Directions,
  GestureDetector: 'GestureDetector',
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {Animated} = require('react-native');
const {Directions} = require('react-native-gesture-handler');
const DynamicHeader = require('../../../containers/Coin/DynamicHeader').default;

const wallets = [
  {id: 'public', name: 'Public wallet', api_channels: {}, color: '#123456'},
  {id: 'private', name: 'Private wallet', api_channels: {}, color: '#654321'},
  {id: 'ethereum', name: 'Ethereum wallet', api_channels: {}, color: '#abcdef'},
];

describe('coin header fling gestures', () => {
  let renderer;

  beforeEach(() => {
    mockDispatch.mockReset();
    jest.spyOn(Animated, 'timing').mockReturnValue({start: jest.fn()});
    mockState = {
      coins: {activeCoin: {id: 'VRSC', display_ticker: 'VRSC'}, showBalance: false},
      settings: {generalWalletSettings: {}},
      coinMenus: {
        activeSubWallets: {VRSC: wallets[0]},
        allSubWallets: {VRSC: wallets},
      },
      ledger: {rates: {}},
    };
    // Simulate the Redux selection becoming visible to the next render.
    mockDispatch.mockImplementation(({payload}) => {
      mockState.coinMenus.activeSubWallets[payload.chainTicker] = payload.subWallet;
    });
  });

  afterEach(() => {
    if (renderer) act(() => renderer.unmount());
    renderer = undefined;
    jest.restoreAllMocks();
  });

  const renderHeader = () => {
    act(() => { renderer = create(<DynamicHeader switchTab={jest.fn()} />); });
  };

  const gestureFor = direction => renderer.root.findAllByType('GestureDetector')
    .map(node => node.props.gesture)
    .find(gesture => gesture.config.direction === direction);

  const fling = direction => act(() => gestureFor(direction).handlers.onEnd({}, true));

  const expectSelectedWallet = expected => {
    expect(mockDispatch).toHaveBeenLastCalledWith({
      type: 'select-sub-wallet',
      payload: {chainTicker: 'VRSC', subWallet: expect.objectContaining({id: expected.id})},
    });
    const firstCard = renderer.root.findAllByType('Card')[0];
    expect(firstCard.findAllByType('Text').map(node => node.children.join('')))
      .toContain(expected.name);
  };

  it.each([
    ['left', Directions.LEFT, [1, 2, 0]],
    ['right', Directions.RIGHT, [2, 1, 0]],
  ])('selects wallets in order and wraps around when flung %s', (_name, direction, expectedIndices) => {
    renderHeader();
    for (const index of expectedIndices) {
      fling(direction);
      expectSelectedWallet(wallets[index]);
    }
    expect(mockDispatch).toHaveBeenCalledTimes(expectedIndices.length);
  });

  it('keeps both callbacks on JS even when a callback is workletized', () => {
    renderHeader();
    const previousSyncHook = global.nativeCallSyncHook;
    const previousRemoteDev = global.__REMOTEDEV__;
    global.nativeCallSyncHook = jest.fn();
    global.__REMOTEDEV__ = false;
    try {
      for (const direction of [Directions.LEFT, Directions.RIGHT]) {
        const gesture = gestureFor(direction);
        const callback = gesture.handlers.onEnd;
        callback.__workletHash = 1;
        gesture.onEnd(callback);
        expect(gesture.handlers.isWorklet).toContain(true);
        expect(gesture.config.runOnJS).toBe(true);
        expect(gesture.shouldUseReanimated).toBe(false);

        // A positive control: without the JS override, this same installed
        // gesture builder would route the worklet to the UI runtime.
        gesture.runOnJS(false);
        expect(gesture.shouldUseReanimated).toBe(true);
      }
    } finally {
      global.nativeCallSyncHook = previousSyncHook;
      global.__REMOTEDEV__ = previousRemoteDev;
    }
  });

  it('does not change the selection when there is only one wallet', () => {
    mockState.coinMenus.allSubWallets.VRSC = [wallets[0]];
    renderHeader();
    fling(Directions.LEFT);
    fling(Directions.RIGHT);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(renderer.root.findAllByType('Card')).toHaveLength(1);
    expect(mockState.coinMenus.activeSubWallets.VRSC).toBe(wallets[0]);
  });
});
