const mockDispatch = jest.fn();
let mockState;

jest.mock('react-redux', () => ({
  useSelector: selector => selector(mockState),
  useDispatch: () => mockDispatch,
}));
jest.mock('../../../actions/actionCreators', () => ({
  setCoinSubWallet: (chainTicker, subWallet) => ({type: 'select-sub-wallet', payload: {chainTicker, subWallet}}),
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

const wallet = (id, name) => Object.freeze({id, name, api_channels: {}, color: '#123456'});
const main = wallet('MAIN_WALLET', 'Public wallet');
const removed = wallet('SUBWALLET_transferred', 'Transferred identity');
const retained = wallet('SUBWALLET_retained', 'Retained identity');

let view;
const render = () => <DynamicHeader switchTab={jest.fn()} />;
const mount = () => act(() => {view = create(render());});
const rebuild = (wallets, selected = mockState.coinMenus.activeSubWallets.VRSC) => {
  mockState = {...mockState, coinMenus: {
    allSubWallets: {VRSC: wallets}, activeSubWallets: {VRSC: selected},
  }};
  act(() => view.update(render()));
};
const cards = () => view.root.findAllByType('Card');
const cardNames = () => cards().map(card => card.findAllByType('Text')[0].children.join(''));
const fling = direction => act(() => view.root.findAllByType('GestureDetector')
  .map(node => node.props.gesture).find(gesture => gesture.config.direction === direction).handlers.onEnd({}, true));
const expectSelected = selected => {
  expect(mockDispatch).toHaveBeenLastCalledWith({type: 'select-sub-wallet', payload: {chainTicker: 'VRSC', subWallet: selected}});
  expect(mockState.coinMenus.activeSubWallets.VRSC).toBe(selected);
};

beforeEach(() => {
  mockDispatch.mockReset().mockImplementation(({payload}) => {
    mockState = {...mockState, coinMenus: {...mockState.coinMenus,
      activeSubWallets: {...mockState.coinMenus.activeSubWallets, [payload.chainTicker]: payload.subWallet},
    }};
  });
  jest.spyOn(Animated, 'timing').mockReturnValue({start: jest.fn()});
  mockState = {
    coins: {activeCoin: {id: 'VRSC', display_ticker: 'VRSC'}, showBalance: false},
    settings: {generalWalletSettings: {}},
    coinMenus: {allSubWallets: {VRSC: [main, removed, retained]}, activeSubWallets: {VRSC: removed}},
    ledger: {rates: {}},
  };
});
afterEach(() => {
  if (view) act(() => view.unmount());
  view = undefined;
  jest.restoreAllMocks();
});

test('removes a transferred selected identity from a mounted header and still accepts card selection', () => {
  mount();
  expect(cardNames()).toEqual([removed.name, retained.name]);
  rebuild([main, retained]);
  expect(cardNames()).toEqual([main.name, retained.name]);
  act(() => cards()[1].props.onPress());
  expectSelected(retained);
  expect(cardNames()).toEqual([retained.name, main.name]);
});

test.each([Directions.LEFT, Directions.RIGHT])('keeps swiping responsive after the selected identity disappears (direction %p)', direction => {
  mount();
  rebuild([main, retained]);
  fling(direction);
  expectSelected(retained);
  expect(cardNames()).toEqual([retained.name, main.name]);
  fling(direction);
  expectSelected(main);
  expect(cardNames()).toEqual([main.name, retained.name]);
});

test('ignores a queued card press for an identity removed after the press callback was created', () => {
  mockState.coinMenus.activeSubWallets.VRSC = main;
  mount();
  const queuedPress = cards()[1].props.onPress;
  expect(cardNames()).toEqual([main.name, removed.name]);
  rebuild([main, retained], main);
  act(() => queuedPress());
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(cardNames()).toEqual([main.name, retained.name]);
});

test('resolves a queued press against the current wallet object after its channels are rebuilt', () => {
  mockState.coinMenus.activeSubWallets.VRSC = main;
  mount();
  const queuedPress = cards()[1].props.onPress;
  const refreshed = {...removed, name: 'Refreshed identity', api_channels: {balances: 'current-channel'}};
  rebuild([main, refreshed, retained], main);
  act(() => queuedPress());
  expectSelected(refreshed);
  expect(cardNames()).toEqual([refreshed.name, retained.name]);
});

test.each([undefined, null, []])('survives an unavailable wallet list during a mounted session transition (%p)', wallets => {
  mount();
  rebuild(wallets);
  expect(cards()).toHaveLength(0);
  fling(Directions.LEFT);
  fling(Directions.RIGHT);
  expect(mockDispatch).not.toHaveBeenCalled();

  rebuild([main, retained], main);
  expect(cardNames()).toEqual([main.name, retained.name]);
  act(() => cards()[1].props.onPress());
  expectSelected(retained);
});

test('List all cards preserves the deliberate null selection', () => {
  mount();
  const list = view.root.findAllByType('Button').find(node => node.children.includes('List all cards'));
  act(() => list.props.onPress());
  expectSelected(null);
  expect(cardNames()).toEqual([main.name, removed.name]);
  mockDispatch.mockClear();
  fling(Directions.LEFT);
  fling(Directions.RIGHT);
  expect(mockDispatch).not.toHaveBeenCalled();
});
