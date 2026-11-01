let mockState;
const mockDispatch = jest.fn();
const mockNavigation = {navigate: jest.fn(), closeDrawer: jest.fn(), dispatch: jest.fn()};
const mockAddWidget = jest.fn();
const mockRefreshRegistrations = jest.fn(() => Promise.resolve());

jest.mock('react-native', () => ({AppState: {addEventListener: () => ({remove: jest.fn()})}}));
jest.mock('react-redux', () => ({
  useSelector: (selector, equals = Object.is) => {
    const value = selector(mockState);
    const previous = require('react').useRef(value);
    if (!equals(previous.current, value)) previous.current = value;
    return previous.current;
  },
  useDispatch: () => mockDispatch,
}));
jest.mock('../../../store', () => ({__esModule: true, default: {getState: () => mockState}}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useFocusEffect: () => {},
  CommonActions: {reset: value => ({type: 'RESET', ...value})},
}));
jest.mock('../../../actions/actionCreators', () => ({
  setActiveCoin: coin => ({type: 'active-coin', coin}),
  setActiveApp: app => ({type: 'active-app', app}),
  setActiveSection: section => ({type: 'active-section', section}),
  setCoinSubWallet: (coin, wallet) => ({type: 'active-subwallet', coin, wallet}),
  expireCoinData: jest.fn(), expireServiceData: jest.fn(), saveGeneralSettings: jest.fn(),
}));
jest.mock('../../../actions/actionDispatchers', () => ({
  conditionallyUpdateService: jest.fn(), conditionallyUpdateWallet: jest.fn(),
  dispatchAddWidget: (...args) => mockAddWidget(...args),
}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({createAlert: jest.fn()}));
jest.mock('../../../actions/actions/sendModal/dispatchers/sendModal', () => ({openAddErc20TokenModal: jest.fn(), openAddPbaasCurrencyModal: jest.fn()}));
jest.mock('../../../actions/actions/services/dispatchers/verusid/registration', () => ({refreshRegistrationJobs: (...args) => mockRefreshRegistrations(...args)}));
jest.mock('../../dragDetection', () => ({dragDetectionEnabled: () => false}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {findCoinObj: jest.fn()}}));
jest.mock('../../../containers/Home/Home.render', () => ({
  HomeRender: props => {
    const React = require('react');
    return React.createElement('Home', props, props.HomeRenderCoinsList());
  },
  HomeRenderCoinsList: props => require('react').createElement('Cards', props),
  HomeRenderWidget: () => null,
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const Home = require('../../../containers/Home/Home').default;
const {CURRENCY_WIDGET_TYPE, TOTAL_UNI_BALANCE_WIDGET_TYPE, VERUSID_WIDGET_TYPE} = require('../../constants/widgets');
const {API_GET_BALANCES} = require('../../constants/intervalConstants');
const coin = {id: 'VRSCTEST', default_app: 'overview', apps: {overview: {data: [{key: 'overview'}]}}};
const wallet = {id: 'main', name: 'Main wallet', api_channels: {[API_GET_BALANCES]: 'vrpc'}};
const identityWallet = {id: 'identity', name: 'Alice@', api_channels: {[API_GET_BALANCES]: 'vrpc.id'}};
const cardId = `${CURRENCY_WIDGET_TYPE}:${coin.id}`;
const stateFor = () => ({
  authentication: {activeAccount: {accountHash: 'alice', testnetOverrides: {}}, sessionEpoch: 1, signedIn: true},
  coins: {activeCoinsForUser: [coin]},
  coinMenus: {allSubWallets: {[coin.id]: [wallet, identityWallet]}, activeSubWallets: {[coin.id]: identityWallet}},
  settings: {generalWalletSettings: {homeCardDragDetection: false, displayCurrency: 'USD'}},
  widgets: {order: {[TOTAL_UNI_BALANCE_WIDGET_TYPE]: 0, [cardId]: 1, [VERUSID_WIDGET_TYPE]: 2}},
  ledger: {balances: {vrpc: {[coin.id]: {total: '3'}}, 'vrpc.id': {[coin.id]: {total: '5'}}}, rates: {}},
  errors: {},
});
let views;
const mount = async () => {
  let view;
  await act(async () => {view = create(<Home />);});
  views.push(view);
  return view;
};
const update = async view => act(async () => {view.update(<Home />);});
beforeEach(() => {jest.clearAllMocks(); mockState = stateFor(); views = [];});
afterEach(() => act(() => views.forEach(view => view.unmount())));

test('Home remains renderable while a profile logout clears the active account', async () => {
  const view = await mount();
  mockState = {...mockState, authentication: {...mockState.authentication, activeAccount: null, signedIn: false},
    coinMenus: {allSubWallets: {}, activeSubWallets: {}}};
  await update(view);
  expect(view.root.findByType('Cards')).toBeDefined();
  expect(mockAddWidget).not.toHaveBeenCalled();
});

test('Home tolerates coin wallets rebuilding and becomes actionable when they arrive', async () => {
  mockState.coinMenus = {allSubWallets: {}, activeSubWallets: {}};
  const view = await mount();
  const cards = () => view.root.findByType('Cards').props;
  expect(cards().totalCryptoBalances[coin.id].toString()).toBe('0');
  await act(async () => cards().handleWidgetPress(cardId));
  expect(mockNavigation.dispatch).not.toHaveBeenCalled();
  mockState = {...mockState, coinMenus: {allSubWallets: {[coin.id]: [wallet]}, activeSubWallets: {}}};
  await update(view);
  await act(async () => cards().handleWidgetPress(cardId));
  expect(mockDispatch).toHaveBeenCalledWith({type: 'active-subwallet', coin: coin.id, wallet});
  expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
});

test('a card opens an available wallet after its previously selected identity was unlinked', async () => {
  const view = await mount();
  mockState = {...mockState, coinMenus: {...mockState.coinMenus, allSubWallets: {[coin.id]: [wallet]}}};
  await update(view);
  await act(async () => view.root.findByType('Cards').props.handleWidgetPress(cardId));
  expect(mockDispatch).toHaveBeenCalledWith({type: 'active-subwallet', coin: coin.id, wallet});
  expect(mockDispatch).not.toHaveBeenCalledWith({type: 'active-subwallet', coin: coin.id, wallet: identityWallet});
});
