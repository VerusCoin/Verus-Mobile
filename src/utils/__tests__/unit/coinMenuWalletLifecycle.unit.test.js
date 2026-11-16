let mockState;
let mockFocused;
const mockDispatch = jest.fn();

jest.mock('react-redux', () => require('../../../tests/helpers/mockReactRedux')({
  useSelector: selector => selector(mockState),
  useDispatch: () => mockDispatch,
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: () => {},
  useIsFocused: () => mockFocused,
}));
jest.mock('@react-navigation/compat', () => ({withNavigationFocus: Component => Component}));
jest.mock('react-native-reanimated', () => ({useSharedValue: value => ({value})}));
jest.mock('../../../containers/Coin/CoinCardPickerSheet', () => 'CoinCardPickerSheet');
jest.mock('../../../containers/Coin/Overview/Overview', () => 'Overview');
jest.mock('../../../containers/Coin/PrelaunchAssetPanel', () => 'PrelaunchAssetPanel');
jest.mock('../../../containers/Coin/SignedInAssetHeader', () => 'SignedInAssetHeader');
jest.mock('../../../containers/Coin/AssetCardStack', () => 'AssetCardStack');
jest.mock('../../../containers/Coin/useAssetCardData', () => ({__esModule: true, default: () => ({})}));
jest.mock('../../../components/DraggableSheet', () => 'DraggableSheet');
jest.mock('../../../components/SignedInActionBar', () => ({__esModule: true, default: 'SignedInActionBar'}));
jest.mock('../../../components/MissingInfoRedirect/MissingInfoRedirect', () => 'MissingInfoRedirect');
jest.mock('../../preconversion/usePrelaunch', () => ({usePrelaunchAsset: () => ({prelaunch: null})}));
jest.mock('../../../actions/actionCreators', () => ({
  setCoinSubWallet: (chainTicker, subWallet) => ({type: 'select-wallet', chainTicker, subWallet}),
  setIsCoinMenuFocused: isFocused => ({type: 'coin-focus', isFocused}),
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const CoinMenus = require('../../../containers/Coin/CoinMenus').default;
const SignedInCoinDetail = require('../../../containers/Coin/SignedInCoinDetail').default;
const {WALLET_APP_OVERVIEW, WALLET_APP_SEND} = require('../../constants/apps');

const wallet = (id, compatible_apps = [WALLET_APP_OVERVIEW, WALLET_APP_SEND]) => ({
  id, name: id, compatible_apps, api_channels: {},
});
const main = wallet('MAIN_WALLET');
const identity = wallet('transferred@');
const overview = {key: WALLET_APP_OVERVIEW, name: 'Overview'};
const activeCoin = {id: 'VRSC', display_ticker: 'VRSC', default_app: 'wallet', apps: {wallet: {data: [overview]}}};
const stateFor = ({account = {accountHash: 'alice'}, cards = [main, identity], selected = null} = {}) => ({
  authentication: {activeAccount: account},
  coins: {activeCoin, activeApp: 'wallet', activeSection: overview, activeCoinsForUser: [activeCoin], showBalance: true},
  coinMenus: {
    allSubWallets: cards == null ? {} : {[activeCoin.id]: cards},
    activeSubWallets: {[activeCoin.id]: selected},
  },
  ledger: {balances: {}},
  services: {},
});

describe('coin menu wallet chooser lifecycle', () => {
  let view;
  const navigation = {
    setOptions: jest.fn(), goBack: jest.fn(), dispatch: jest.fn(), getParent: () => undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFocused = true;
    mockState = stateFor();
  });

  afterEach(() => {
    if (view) act(() => view.unmount());
    view = null;
  });

  const render = (Screen = SignedInCoinDetail) => act(() => {view = create(<Screen navigation={navigation} route={{}} />);});
  const update = (changes = {}) => {
    mockState = stateFor(changes);
    act(() => view.update(<SignedInCoinDetail navigation={navigation} route={{}} />));
  };
  const chooser = () => view.root.findByType('CoinCardPickerSheet').props;
  const options = () => chooser().subWallets;

  it('removes an unlinked identity from an already mounted chooser', () => {
    render();
    expect(options()).toEqual([main, identity]);
    update({cards: [main]});
    expect(options()).toEqual([main]);
  });

  it('uses refreshed wallet definitions and newly linked wallets immediately', () => {
    render();
    const updatedIdentity = {...identity, name: 'New display name'};
    const linked = wallet('new@');
    update({cards: [main, updatedIdentity, linked]});
    expect(options()).toEqual([main, updatedIdentity, linked]);
    expect(options()[1]).toBe(updatedIdentity);
  });

  it('does not present the chooser from a screen hidden behind home or another tab', () => {
    render();
    mockFocused = false;
    update();
    expect(chooser().visible).toBe(false);
    update({cards: [main]});
    expect(chooser().visible).toBe(false);
    mockFocused = true;
    update({cards: [main]});
    expect(chooser().visible).toBe(true);
    expect(options()).toEqual([main]);
  });

  it('does not present a native chooser when logout clears the selected wallet before navigation unmounts', () => {
    mockState = stateFor({selected: identity});
    render();
    update({account: null, cards: null, selected: null});
    expect(chooser().visible).toBe(false);
    expect(view.root.findAllByType('AssetCardStack')).toHaveLength(0);
  });

  it('does not select the previous account’s only wallet during a teardown mount', () => {
    mockState = stateFor({account: null, cards: [identity]});
    render(CoinMenus);
    expect(mockDispatch.mock.calls.map(([action]) => action.type)).not.toContain('select-wallet');
    expect(chooser().visible).toBe(false);
  });

  it('removes the native chooser while no current wallets are available', () => {
    render();
    expect(options()).toEqual([main, identity]);
    update({cards: []});
    expect(chooser().visible).toBe(false);
    update({cards: null});
    expect(chooser().visible).toBe(false);
    update({cards: [main]});
    expect(options()).toEqual([main]);
  });
});
