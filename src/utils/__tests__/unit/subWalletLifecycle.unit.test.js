import {coinMenus} from '../../../reducers/gui/coinMenus';
import {extractDisplaySubWallets} from '../../subwallet/extractSubWallets';
import {SET_COIN_SUB_WALLET, SET_USER_COINS_COMPLETE, SIGN_OUT_COMPLETE} from '../../constants/storeType';

const wallet = (id, name = id, channel = id) => ({id, name, api_channels: {get_balances: channel}});
const rebuild = (state, allSubWallets) => coinMenus(state, {
  type: SET_USER_COINS_COMPLETE,
  payload: {allSubWallets},
});
const select = (state, chainTicker, subWallet) => coinMenus(state, {
  type: SET_COIN_SUB_WALLET,
  payload: {chainTicker, subWallet},
});

describe('subwallet lifecycle after identity changes', () => {
  it('replaces an unlinked identity selection with the current main wallet', () => {
    const identity = wallet('SUBWALLET_vrpc.iTransferred.system', 'transferred@');
    const main = wallet('MAIN_WALLET', 'Public wallet');
    const retainedIdentity = wallet('SUBWALLET_vrpc.iRetained.system', 'retained@');
    const previous = select(rebuild(undefined, {VRSC: [main, identity, retainedIdentity]}), 'VRSC', identity);
    const result = rebuild(previous, {VRSC: [retainedIdentity, main]});

    expect(result.activeSubWallets.VRSC).toBe(main);
    expect(result.allSubWallets.VRSC).not.toContain(identity);
    expect(previous.activeSubWallets.VRSC).toBe(identity);
  });

  it('uses the remaining current wallet when this currency has no MAIN_WALLET', () => {
    const identity = wallet('SUBWALLET_vrpc.iTransferred.system');
    const publicWallet = wallet('SUBWALLET_vrpc.RWallet.system');
    const previous = select(undefined, 'VRSCTEST', identity);
    const result = rebuild(previous, {VRSCTEST: [publicWallet]});
    expect(result.activeSubWallets.VRSCTEST).toBe(publicWallet);
  });

  it('preserves a valid selection using its rebuilt channels and display name', () => {
    const previousWallet = wallet('identity', 'Old name', 'old-channel');
    const refreshedWallet = wallet('identity', 'New name', 'new-channel');
    const previous = select(undefined, 'VRSC', previousWallet);
    const result = rebuild(previous, {VRSC: [wallet('MAIN_WALLET'), refreshedWallet]});
    expect(result.activeSubWallets.VRSC).toBe(refreshedWallet);
    expect(result.activeSubWallets.VRSC.api_channels.get_balances).toBe('new-channel');
  });

  it('keeps an explicitly open wallet chooser open during a rebuild', () => {
    const previous = select(undefined, 'VRSC', null);
    const result = rebuild(previous, {VRSC: [wallet('MAIN_WALLET')]});
    expect(result.activeSubWallets.VRSC).toBeNull();
  });

  it('drops selections for removed currencies or currencies with no remaining wallets', () => {
    const previous = select(select(undefined, 'VRSC', wallet('old-vrsc')), 'BTC', wallet('old-btc'));
    const result = rebuild(previous, {VRSC: []});
    expect(result.activeSubWallets).toEqual({});
  });

  it.each(['same profile', 'different profile'])('does not retain identity selection after logout and login to %s', profile => {
    const identity = wallet('SUBWALLET_vrpc.iPrevious.system');
    const previous = {...select(rebuild(undefined, {VRSC: [identity]}), 'VRSC', identity), claimDisabled: true};
    const signedOut = coinMenus(previous, {type: SIGN_OUT_COMPLETE});
    expect(signedOut).toEqual({activeSubWallets: {}, allSubWallets: {}, claimDisabled: false});

    const currentWallet = wallet('SUBWALLET_vrpc.RCurrent.system');
    const wallets = profile === 'same profile' ? [currentWallet, identity] : [currentWallet];
    const loggedIn = rebuild(signedOut, {VRSC: wallets});
    expect(loggedIn.activeSubWallets).toEqual({});
    expect(loggedIn.allSubWallets.VRSC).toEqual(wallets);
  });
});

describe('display subwallet selector', () => {
  it('sorts the display without mutating the stored wallet order', () => {
    const publicWallet = wallet('public', 'Z public wallet');
    const identity = wallet('identity', 'Alice@');
    const stored = Object.freeze([publicWallet, identity]);
    const state = {coinMenus: {allSubWallets: {VRSC: stored}}, errors: {}};

    expect(extractDisplaySubWallets(state).VRSC).toEqual([identity, publicWallet]);
    expect(state.coinMenus.allSubWallets.VRSC).toBe(stored);
    expect(state.coinMenus.allSubWallets.VRSC).toEqual([publicWallet, identity]);
  });

  it('continues excluding wallets whose channels failed to initialize', () => {
    const publicWallet = wallet('public', 'Z public wallet');
    const identity = wallet('identity', 'Alice@');
    const state = {
      coinMenus: {allSubWallets: {VRSC: Object.freeze([publicWallet, identity])}},
      errors: {init_identity_errors: {VRSC: {message: 'Unavailable'}}},
    };
    expect(extractDisplaySubWallets(state).VRSC).toEqual([publicWallet]);
  });
});
