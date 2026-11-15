import fs from 'fs';
import path from 'path';
import vm from 'vm';
import {prepareSubWalletCarousel} from '../../subwallet/carousel';
import {coinMenus} from '../../../reducers/gui/coinMenus';
import {SET_COIN_SUB_WALLET, SET_USER_COINS_COMPLETE, SIGN_OUT_COMPLETE} from '../../constants/storeType';

const main = Object.freeze({id: 'MAIN_WALLET', name: 'Public wallet'});
const identity = Object.freeze({id: 'SUBWALLET_vrpc.transferred.system', name: 'Transferred identity'});
const retained = Object.freeze({id: 'SUBWALLET_vrpc.retained.system', name: 'Retained identity'});
const ids = items => items.map(item => item.id);

test('a removed selected identity cannot block the JavaScript thread', () => {
  // A timeout bounds this regression even if an unbounded rotation is restored.
  // The old carousel never returned for this exact nonempty-list input.
  const source = fs.readFileSync(path.resolve(__dirname, '../../subwallet/carousel.js'), 'utf8');
  const result = vm.runInNewContext(`${source.replace('export const ', 'const ')}\nprepareSubWalletCarousel(wallets, selected)`,
    {wallets: [main, retained], selected: identity}, {timeout: 100});
  expect(ids(result)).toEqual([main.id, retained.id]);
});

test.each([undefined, null, []])('tolerates wallet lists unavailable during logout/rebuild (%p)', wallets => {
  expect(prepareSubWalletCarousel(wallets, identity)).toEqual([]);
});

test('rotates valid selections without mutating the store or its wallet objects', () => {
  const wallets = Object.freeze([main, identity, retained]);
  const result = prepareSubWalletCarousel(wallets, identity);
  expect(ids(result)).toEqual([identity.id, retained.id, main.id]);
  expect(result.map(item => item.index)).toEqual([0, 1, 2]);
  expect(wallets).toEqual([main, identity, retained]);
  expect(identity).not.toHaveProperty('index');
});

test.each([null, main])('keeps the available order without a different valid selection (%p)', selected => {
  expect(ids(prepareSubWalletCarousel([main, retained], selected))).toEqual([main.id, retained.id]);
});

test('survives linked-ID selection, unlink, logout and a different profile without retaining that ID', () => {
  let state = coinMenus(undefined, {type: SET_USER_COINS_COMPLETE, payload: {allSubWallets: {VRSC: [main, identity]}}});
  state = coinMenus(state, {type: SET_COIN_SUB_WALLET, payload: {chainTicker: 'VRSC', subWallet: identity}});
  expect(ids(prepareSubWalletCarousel(state.allSubWallets.VRSC, state.activeSubWallets.VRSC))).toEqual([identity.id, main.id]);

  state = coinMenus(state, {type: SET_USER_COINS_COMPLETE, payload: {allSubWallets: {VRSC: [main]}}});
  expect(ids(prepareSubWalletCarousel(state.allSubWallets.VRSC, state.activeSubWallets.VRSC))).toEqual([main.id]);
  state = coinMenus(state, {type: SIGN_OUT_COMPLETE});
  expect(prepareSubWalletCarousel(state.allSubWallets.VRSC, state.activeSubWallets.VRSC)).toEqual([]);

  state = coinMenus(state, {type: SET_USER_COINS_COMPLETE, payload: {allSubWallets: {VRSC: [main, retained]}}});
  expect(ids(prepareSubWalletCarousel(state.allSubWallets.VRSC, state.activeSubWallets.VRSC))).toEqual([main.id, retained.id]);
});
