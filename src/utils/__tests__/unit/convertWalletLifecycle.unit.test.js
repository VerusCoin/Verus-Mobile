let mockState;

jest.mock('react-redux', () => ({
  useSelector: (selector, equals = Object.is) => {
    const value = selector(mockState);
    const previous = require('react').useRef(value);
    if (!equals(previous.current, value)) previous.current = value;
    return previous.current;
  },
}));
jest.mock('../../../styles', () => ({}));
jest.mock('../../../components/Button', () => 'Button');
jest.mock('../../../containers/Convert/ConvertCard/ConvertCard', () => 'ConvertCard');
jest.mock('../../../components/ConvertCardModal/ConvertCardModal', () => 'ConvertCardModal');
jest.mock('../../../actions/actionDispatchers', () => ({closeLoadingModal: jest.fn(), openLoadingModal: jest.fn()}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({createAlert: jest.fn()}));
jest.mock('../../api/routers/getConversionPaths', () => ({getConversionPaths: jest.fn()}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {}}));
jest.mock('react-native-format-currency', () => ({formatCurrency: ({amount}) => [`$${amount}`]}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const Convert = require('../../../containers/Convert/Convert').default;
const {coinMenus} = require('../../../reducers/gui/coinMenus');
const {coins} = require('../../../reducers/coins');
const {authentication} = require('../../../reducers/authentication');
const {SIGN_OUT_COMPLETE, SET_USER_COINS_COMPLETE} = require('../../constants/storeType');
const {API_GET_BALANCES} = require('../../constants/intervalConstants');

const coin = {id: 'VRSCTEST', currency_id: 'test-currency', display_name: 'Verus Test', display_ticker: 'VRSCTEST', proto: 'vrsc', tags: []};
const main = {id: 'main', api_channels: {[API_GET_BALANCES]: 'vrpc'}};
const identity = {id: 'identity', api_channels: {[API_GET_BALANCES]: 'vrpc.id'}};
const rebuild = wallets => ({type: SET_USER_COINS_COMPLETE, payload: {allSubWallets: {[coin.id]: wallets}, activeCoinsForUser: [coin], status: {}}});
const stateFor = () => ({
  authentication: {activeAccount: {accountHash: 'alice', keys: {}}, signedIn: true},
  coins: coins(undefined, rebuild([main, identity])),
  coinMenus: coinMenus(undefined, rebuild([main, identity])),
  settings: {generalWalletSettings: {displayCurrency: 'USD'}},
  ledger: {balances: {vrpc: {[coin.id]: {total: '3'}}, 'vrpc.id': {[coin.id]: {total: '5'}}}, rates: {}},
});
const reduce = action => {
  mockState = {...mockState,
    authentication: authentication(mockState.authentication, action),
    coins: coins(mockState.coins, action),
    coinMenus: coinMenus(mockState.coinMenus, action),
  };
};
let view;
beforeEach(() => {mockState = stateFor();});
afterEach(() => {if (view) act(() => view.unmount()); view = undefined;});
const mount = async () => act(async () => {view = create(<Convert />);});
const update = async () => act(async () => {view.update(<Convert />);});
const total = () => view.root.findByType('ConvertCardModal').props.totalBalances[coin.id].crypto.toString();

test('a mounted conversion screen survives logout clearing wallets before navigation unmounts it', async () => {
  await mount();
  expect(total()).toBe('8');
  reduce({type: SIGN_OUT_COMPLETE});
  expect(mockState.coins.activeCoinsForUser).toEqual([coin]);
  expect(mockState.coinMenus.allSubWallets).toEqual({});
  await update();
  expect(total()).toBe('0');
});

test('balances recover when subwallets become available after a profile rebuild', async () => {
  mockState.coinMenus = {...mockState.coinMenus, allSubWallets: {}};
  await mount();
  expect(total()).toBe('0');
  reduce(rebuild([main]));
  await update();
  expect(total()).toBe('3');
  expect(view.root.findByType('ConvertCardModal').props.currencies).toEqual([
    expect.objectContaining({key: coin.currency_id, rightDescription: '3'}),
  ]);
});
