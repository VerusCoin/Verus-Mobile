const mockGetState = jest.fn();
const mockGetIdentity = jest.fn();

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {getState: () => mockGetState()},
}));
jest.mock('../../seedCrypt', () => ({
  decryptkey: (_password, value) => value,
  encryptkey: jest.fn(),
}));
jest.mock('../../keychain/keychain', () => ({
  getSessionCredential: async () => 'password',
  setSessionCredential: jest.fn(),
}));
jest.mock('../../api/channels/verusid/requests/getIdentity', () => ({
  getIdentity: (...args) => mockGetIdentity(...args),
}));
jest.mock('../../CoinData/CoinData', () => ({
  getVerusIdCurrency: coin => coin.testnet ? 'VRSCTEST' : 'VRSC',
}));
jest.mock('../../CoinData/CoinsList', () => ({
  coinsList: {
    VRSC: {currency_id: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV'},
    VRSCTEST: {currency_id: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq'},
  },
}));
jest.mock('../../enabledChannels', () => ({
  vrpcChannelEnabled: () => true,
  dlightEnabled: () => false,
  wyreCoinChannelEnabled: () => false,
}));

import coinsSaga from '../../../sagas/coins';
import {coinMenus} from '../../../reducers/gui/coinMenus';
import {extractDisplaySubWallets} from '../../subwallet/extractSubWallets';
import {prepareSubWalletCarousel} from '../../subwallet/carousel';
import {SET_COIN_SUB_WALLET, SET_USER_COINS} from '../../constants/storeType';
import {ELECTRUM, VRPC} from '../../constants/intervalConstants';
import {VERUSID_SERVICE_ID} from '../../constants/services';
import {toIAddress} from 'verus-typescript-primitives';
import {requestServiceStoredData} from '../../auth/authBox';
import {identityLabel} from '../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/presentation';

const {runSaga, stdChannel} = jest.requireActual('redux-saga');
const flush = () => new Promise(resolve => setImmediate(resolve));
let state, task, dispatch;
const subidAddress = 'i7jpcdr29uBZAee1LC9EeYJcaFX2QPd8sb';
const subidFullName = 'subid.dudecoin.VRSCTEST@';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetIdentity.mockImplementation(() => {throw new Error('Unexpected name lookup');});
  state = {
    authentication: {activeAccount: {accountHash: 'account'}, sessionKey: 'session-key'},
    services: {stored: {}},
    coinMenus: coinMenus(undefined, {type: 'init'}),
    channelStore_vrpc: {watchedAddresses: {}},
    errors: {},
  };
  mockGetState.mockImplementation(() => state);
  const channel = stdChannel();
  dispatch = action => {
    state = {...state, coinMenus: coinMenus(state.coinMenus, action)};
    channel.put(action);
  };
  task = runSaga({channel, getState: () => state, dispatch}, coinsSaga);
});

afterEach(async () => {
  task.cancel();
  await task.toPromise();
});

it.each([
  [false, 'VRSC', 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV'],
  [true, 'VRSCTEST', 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq'],
])('displays saved full names consistently without name lookups (testnet=%s)', async (testnet, ticker, system) => {
  const t1Address = toIAddress(`T1.${ticker}@`);
  const mumbleAddress = toIAddress(`Mumble.${ticker}@`);
  const childAddress = toIAddress(`Child.Parent.${ticker}@`);
  const t1Name = testnet ? 'T1.VRSCTEST@' : 'T1@';
  const mumbleName = testnet ? 'Mumble.VRSCTEST@' : 'Mumble@';
  const childName = testnet ? 'Child.Parent.VRSCTEST@' : 'Child.Parent@';
  const linkedIds = Object.freeze({
    [t1Address]: t1Name,
    [mumbleAddress]: mumbleName,
    [childAddress]: childName,
    iOther: 'Other.PBaaS@',
    ...(testnet ? {[subidAddress]: subidFullName} : {}),
  });
  state.services.stored[VERUSID_SERVICE_ID] = JSON.stringify({linked_ids: {[ticker]: linkedIds}});
  state.channelStore_vrpc.watchedAddresses[ticker] = {
    R123456789Public: {},
    // A linked identity can also be watched without losing its name.
    [mumbleAddress]: {},
  };
  const oldSelection = {
    id: `SUBWALLET_vrpc.${t1Address}.${system}`,
    name: t1Name,
  };
  dispatch({type: SET_COIN_SUB_WALLET, payload: {chainTicker: ticker, subWallet: oldSelection}});
  dispatch({type: SET_USER_COINS, payload: {activeCoinsForUser: [{
    id: ticker,
    testnet,
    proto: 'vrsc',
    tags: [],
    dominant_channel: ELECTRUM,
    compatible_channels: [ELECTRUM, VRPC],
  }]}});
  await flush();

  const wallets = state.coinMenus.allSubWallets[ticker];
  const byChannel = Object.fromEntries(wallets.map(wallet => [wallet.channel, wallet.name]));
  expect(byChannel).toEqual({
    [ELECTRUM]: 'Main',
    [`vrpc.R123456789Public.${system}`]: 'R1234...ublic',
    [`vrpc.${t1Address}.${system}`]: t1Name,
    [`vrpc.${mumbleAddress}.${system}`]: mumbleName,
    [`vrpc.${childAddress}.${system}`]: childName,
    [`vrpc.iOther.${system}`]: 'Other.PBaaS@',
    ...(testnet ? {[`vrpc.${subidAddress}.${system}`]: subidFullName} : {}),
  });
  expect(state.coinMenus.activeSubWallets[ticker].name).toBe(t1Name);
  expect(state.coinMenus.activeSubWallets[ticker]).not.toBe(oldSelection);
  expect(extractDisplaySubWallets(state)[ticker].map(wallet => wallet.name)).toEqual(
    wallets.map(wallet => wallet.name).sort(),
  );
  expect(prepareSubWalletCarousel(wallets, state.coinMenus.activeSubWallets[ticker])[0].name).toBe(t1Name);
  const loaded = await requestServiceStoredData(VERUSID_SERVICE_ID);
  expect(loaded.linked_ids[ticker]).toEqual(linkedIds);
  expect(identityLabel(t1Address, loaded.linked_ids[ticker])).toBe(t1Name);
  expect(identityLabel(mumbleAddress, loaded.linked_ids[ticker])).toBe(mumbleName);
  expect(identityLabel(childAddress, loaded.linked_ids[ticker])).toBe(childName);
  if (testnet) {
    expect(identityLabel(subidAddress, loaded.linked_ids.VRSCTEST)).toBe(subidFullName);
  }
  expect(mockGetIdentity).not.toHaveBeenCalled();
});
