jest.mock('react-redux', () => ({connect: () => Component => Component}));
jest.mock('@react-navigation/compat', () => ({
  NavigationActions: {back: () => ({type: 'back'})},
  withNavigationFocus: Component => Component,
}));
jest.mock('react-native-paper', () => ({Portal: {Host: 'PortalHost'}, BottomNavigation: 'BottomNavigation'}));
jest.mock('../../../containers/Coin/Overview/Overview', () => 'Overview');
jest.mock('../../../containers/Coin/SendCoin/SendCoin', () => 'SendCoin');
jest.mock('../../../containers/Coin/ReceiveCoin/ReceiveCoin', () => 'ReceiveCoin');
jest.mock('../../../containers/Coin/ConvertCoin/ConvertCoin', () => 'ConvertCoin');
jest.mock('../../../containers/Coin/ManageCoin/ManageCoin', () => 'ManageCoin');
jest.mock('../../../containers/Coin/DynamicHeader', () => 'DynamicHeader');
jest.mock('../../../containers/SubWalletSelect/SubWalletSelectorModal', () => 'SubWalletSelectorModal');
jest.mock('../../../components/MissingInfoRedirect/MissingInfoRedirect', () => 'MissingInfoRedirect');
jest.mock('../../../actions/actionCreators', () => ({
  setActiveSection: activeSection => ({type: 'set-section', activeSection}),
  setCoinSubWallet: (chainTicker, subWallet) => ({type: 'select-wallet', chainTicker, subWallet}),
  setIsCoinMenuFocused: isFocused => ({type: 'coin-focus', isFocused}),
}));
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({createAlert: jest.fn()}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {CoinMenus} = require('../../../containers/Coin/CoinMenus');
const {WALLET_APP_OVERVIEW, WALLET_APP_SEND} = require('../../constants/apps');
const {createAlert} = require('../../../actions/actions/alert/dispatchers/alert');

const wallet = (id, compatible_apps = [WALLET_APP_OVERVIEW, WALLET_APP_SEND]) => ({id, name: id, compatible_apps});
const main = wallet('MAIN_WALLET');
const identity = wallet('transferred@');
const overview = {key: WALLET_APP_OVERVIEW, name: 'Overview'};

describe('coin menu wallet chooser lifecycle', () => {
  let view;
  let props;

  beforeEach(() => {
    jest.clearAllMocks();
    props = {
      activeAccount: {accountHash: 'alice'},
      isFocused: true,
      activeCoin: {id: 'VRSC', display_ticker: 'VRSC', apps: {wallet: {data: [overview]}}},
      activeApp: 'wallet',
      activeSection: overview,
      allSubWallets: [main, identity],
      selectedSubWallet: null,
      dispatch: jest.fn(),
      navigation: {setOptions: jest.fn(), dispatch: jest.fn()},
      route: {},
      services: {},
    };
  });

  afterEach(() => {
    if (view) act(() => view.unmount());
    view = null;
  });

  const render = () => act(() => {view = create(<CoinMenus {...props} />);});
  const update = changes => {
    props = {...props, ...changes};
    act(() => view.update(<CoinMenus {...props} />));
  };
  const options = () => view.root.findByType('SubWalletSelectorModal').props.subWallets;

  it('removes an unlinked identity from an already mounted chooser', () => {
    render();
    expect(options()).toEqual([main, identity]);
    update({allSubWallets: [main]});
    expect(options()).toEqual([main]);
  });

  it('uses refreshed wallet definitions and newly linked wallets immediately', () => {
    render();
    const updatedIdentity = {...identity, name: 'New display name'};
    const linked = wallet('new@');
    update({allSubWallets: [main, updatedIdentity, linked]});
    expect(options()).toEqual([main, updatedIdentity, linked]);
    expect(options()[1]).toBe(updatedIdentity);
  });

  it('does not present the chooser from a screen hidden behind home or another tab', () => {
    render();
    update({isFocused: false});
    expect(view.root.findAllByType('SubWalletSelectorModal')).toHaveLength(0);
    update({allSubWallets: [main], selectedSubWallet: null});
    expect(view.root.findAllByType('SubWalletSelectorModal')).toHaveLength(0);
    update({isFocused: true});
    expect(options()).toEqual([main]);
  });

  it('does not present a native chooser when logout clears the selected wallet before navigation unmounts', () => {
    props.selectedSubWallet = identity;
    render();
    update({activeAccount: null, selectedSubWallet: null, allSubWallets: undefined});
    expect(view.root.findAllByType('SubWalletSelectorModal')).toHaveLength(0);
    expect(view.root.findAllByType('DynamicHeader')).toHaveLength(0);
  });

  it('does not select the previous account’s only wallet during a teardown mount', () => {
    props.activeAccount = null;
    props.allSubWallets = [identity];
    render();
    expect(props.dispatch.mock.calls.map(([action]) => action.type)).not.toContain('select-wallet');
    expect(view.root.findAllByType('SubWalletSelectorModal')).toHaveLength(0);
  });

  it('keeps a compatibility filter current when identities are removed or added', () => {
    props.allSubWallets = [wallet('view-only', [WALLET_APP_OVERVIEW]), identity];
    render();
    act(() => view.getInstance().findCompatibleSubwallet(WALLET_APP_SEND));
    expect(options()).toEqual([identity]);
    const linked = wallet('new@');
    update({allSubWallets: [props.allSubWallets[0], linked]});
    expect(options()).toEqual([linked]);
  });

  it('falls back to remaining cards when the final compatible identity is unlinked', () => {
    const viewOnly = wallet('view-only', [WALLET_APP_OVERVIEW]);
    props.allSubWallets = [viewOnly, identity];
    render();
    act(() => view.getInstance().findCompatibleSubwallet(WALLET_APP_SEND));
    expect(options()).toEqual([identity]);
    update({allSubWallets: [viewOnly]});
    expect(options()).toEqual([viewOnly]);
  });

  it('removes the native chooser while no current wallets are available', () => {
    render();
    expect(options()).toEqual([main, identity]);
    update({allSubWallets: []});
    expect(view.root.findAllByType('SubWalletSelectorModal')).toHaveLength(0);
    update({allSubWallets: undefined});
    expect(view.root.findAllByType('SubWalletSelectorModal')).toHaveLength(0);
    update({allSubWallets: [main]});
    expect(options()).toEqual([main]);
  });

  it('does not use constructor-cached identities when finding compatible cards', () => {
    props.allSubWallets = [wallet('view-only', [WALLET_APP_OVERVIEW]), identity];
    render();
    update({allSubWallets: [props.allSubWallets[0]]});
    act(() => view.getInstance().findCompatibleSubwallet(WALLET_APP_SEND));
    expect(createAlert).toHaveBeenCalledWith('Error', 'No compatible cards found.');
    expect(props.dispatch.mock.calls.map(([action]) => action.type)).not.toContain('select-wallet');
  });
});
