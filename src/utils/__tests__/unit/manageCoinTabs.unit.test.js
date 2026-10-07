const mockDispatch = jest.fn();
const mockUpdateWallet = jest.fn();
let mockState;

jest.mock('react-redux', () => ({useSelector: selector => selector(mockState)}));
jest.mock('../../../hooks/useObjectSelector', () => ({
  useObjectSelector: selector => selector(mockState),
}));
jest.mock('../../../store', () => ({
  __esModule: true,
  default: {dispatch: mockDispatch, getState: () => mockState},
}));
jest.mock('../../../actions/actionDispatchers', () => ({
  conditionallyUpdateWallet: mockUpdateWallet,
}));
jest.mock('../../../actions/actionCreators', () => ({
  expireCoinData: (coin, call) => ({type: 'expire', coin, call}),
}));
jest.mock('../../../containers/Coin/ManageCoin/DepositCoin/DepositCoin', () => 'DepositScene');
jest.mock('../../../containers/Coin/ManageCoin/WithdrawCoin/WithdrawCoin', () => 'WithdrawScene');
// Keep TabView and its adapter real; replace only the native pager boundary.
jest.mock('react-native-pager-view', () => {
  const React = require('react');
  return class PagerView extends React.Component {
    setPage(index) {
      this.props.onPageSelected({nativeEvent: {position: index}});
    }
    setPageWithoutAnimation(index) {
      this.setPage(index);
    }
    render() {
      return React.createElement('PagerView', this.props, this.props.children);
    }
  };
});

const React = require('react');
const {act, create} = require('react-test-renderer');
const {TabView} = require('react-native-tab-view');
const ManageCoin = require('../../../containers/Coin/ManageCoin/ManageCoin').default;
const {
  API_GET_DEPOSIT_SOURCES,
  API_GET_WITHDRAW_DESTINATIONS,
} = require('../../constants/intervalConstants');

it('keeps deposit/withdraw navigation and refresh behavior with Tab View 3', () => {
  mockState = {
    coins: {activeCoin: {id: 'fixture'}},
    updates: {coinUpdateTracker: {fixture: {}}},
  };
  let renderer;
  try {
    act(() => { renderer = create(<ManageCoin />); });
    expect(renderer.root.findByType(TabView).props.navigationState).toEqual({
      index: 0,
      routes: [{key: 'deposit', title: 'Deposit'}, {key: 'withdraw', title: 'Withdraw'}],
    });

    act(() => renderer.root.findByType('PagerView').props.onPageSelected({
      nativeEvent: {position: 1},
    }));
    expect(renderer.root.findByType(TabView).props.navigationState.index).toBe(1);
    expect(renderer.root.findAllByType('WithdrawScene')).toHaveLength(1);

    act(() => renderer.root.findByType('PagerView').props.onPageSelected({
      nativeEvent: {position: 0},
    }));
    expect(renderer.root.findByType(TabView).props.navigationState.index).toBe(0);
    expect(renderer.root.findAllByType('DepositScene')).toHaveLength(1);

    expect(mockDispatch.mock.calls).toEqual([
      [{type: 'expire', coin: 'fixture', call: API_GET_WITHDRAW_DESTINATIONS}],
      [{type: 'expire', coin: 'fixture', call: API_GET_DEPOSIT_SOURCES}],
    ]);
    expect(mockUpdateWallet.mock.calls).toEqual([
      [mockState, mockDispatch, 'fixture', API_GET_WITHDRAW_DESTINATIONS],
      [mockState, mockDispatch, 'fixture', API_GET_DEPOSIT_SOURCES],
    ]);
  } finally {
    if (renderer) act(() => renderer.unmount());
  }
});
