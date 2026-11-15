const mockUpdateWallets = jest.fn();
const mockUpdateService = jest.fn();
const mockState = {authentication: {activeAccount: {accountHash: 'alice'}, sessionEpoch: 1}};

jest.mock('react-redux', () => ({connect: () => component => component}));
jest.mock('react-native', () => ({View: 'View', FlatList: 'FlatList', TouchableOpacity: 'TouchableOpacity'}));
jest.mock('react-native-paper', () => ({Portal: 'Portal', List: {}, Text: 'Text', Badge: 'Badge'}));
jest.mock('../../../store', () => ({__esModule: true, default: {getState: () => mockState}}));
jest.mock('../../../styles', () => ({}));
jest.mock('../../../images/customIcons', () => ({TransactionLogos: {}}));
jest.mock('../../../components/TxDetailsModal/TxDetailsModal', () => () => null);
jest.mock('../../../selectors/transactions', () => ({selectTransactions: jest.fn()}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {}}));
jest.mock('../../math', () => ({scientificToDecimal: jest.fn()}));
jest.mock('../../../actions/actionCreators', () => ({
  expireCoinData: jest.fn(), expireServiceData: jest.fn(), setActiveOverviewFilter: jest.fn(),
}));
jest.mock('../../../actions/actionDispatchers', () => ({
  conditionallyUpdateWallets: (...args) => mockUpdateWallets(...args),
  conditionallyUpdateService: (...args) => mockUpdateService(...args),
}));

const Overview = require('../../../containers/Coin/Overview/Overview').default;
const {
  API_GET_BALANCES, API_GET_FIATPRICE, API_GET_INFO, API_GET_TRANSACTIONS,
  API_GET_SERVICE_ACCOUNT, API_GET_SERVICE_PAYMENT_METHODS, API_GET_SERVICE_TRANSFERS,
  API_GET_SERVICE_RATES, API_GET_SERVICE_NOTIFICATIONS,
} = require('../../constants/intervalConstants');

const createOverview = () => {
  const overview = new Overview({dispatch: jest.fn(), activeCoin: {id: 'VRSCTEST'}});
  overview.setState = (state, callback) => {
    overview.state = {...overview.state, ...state};
    if (callback) overview.refreshFinished = callback();
  };
  return overview;
};

beforeEach(() => {
  mockUpdateWallets.mockReset().mockResolvedValue([]);
  mockUpdateService.mockReset().mockResolvedValue(undefined);
});

test('Overview groups balance and history work without waiting for services', async () => {
  let finishWallets;
  let finishService;
  mockUpdateWallets.mockReturnValueOnce(new Promise(resolve => {finishWallets = resolve;}));
  mockUpdateService.mockReturnValueOnce(new Promise(resolve => {finishService = resolve;}));
  const overview = createOverview();

  overview.refresh();

  expect(mockUpdateWallets).toHaveBeenCalledTimes(1);
  expect(mockUpdateWallets).toHaveBeenCalledWith(mockState, overview.props.dispatch, [
    {chainTicker: 'VRSCTEST', updateId: API_GET_FIATPRICE},
    {chainTicker: 'VRSCTEST', updateId: API_GET_BALANCES},
    {chainTicker: 'VRSCTEST', updateId: API_GET_INFO},
    {chainTicker: 'VRSCTEST', updateId: API_GET_TRANSACTIONS},
  ]);
  expect(mockUpdateService).toHaveBeenCalledTimes(1);
  expect(overview.state.loading).toBe(true);

  // A second pull while the first is pending must not start another cycle.
  overview.refresh();
  expect(mockUpdateWallets).toHaveBeenCalledTimes(1);

  finishWallets([]);
  await Promise.resolve();
  expect(overview.state.loading).toBe(true);

  finishService();
  await overview.refreshFinished;
  expect(mockUpdateService.mock.calls.map(call => call[2])).toEqual([
    API_GET_SERVICE_ACCOUNT, API_GET_SERVICE_PAYMENT_METHODS, API_GET_SERVICE_TRANSFERS,
    API_GET_SERVICE_RATES, API_GET_SERVICE_NOTIFICATIONS,
  ]);
  expect(overview.state.loading).toBe(false);
});

test('Overview releases loading and continues services when refresh work fails', async () => {
  const walletError = new Error('Wallet unavailable');
  const serviceError = new Error('Service unavailable');
  mockUpdateWallets.mockRejectedValueOnce(walletError);
  mockUpdateService.mockRejectedValueOnce(serviceError);
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});

  try {
    const overview = createOverview();
    overview.refresh();
    await overview.refreshFinished;

    expect(mockUpdateService).toHaveBeenCalledTimes(5);
    expect(warning).toHaveBeenCalledWith(walletError);
    expect(warning).toHaveBeenCalledWith(serviceError);
    expect(overview.state.loading).toBe(false);
  } finally {
    warning.mockRestore();
  }
});
