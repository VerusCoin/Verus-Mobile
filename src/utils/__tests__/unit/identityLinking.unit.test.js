let mockState;
let mockSaved;
const mockGetIdentitiesWithAddress = jest.fn();
const mockGetInfo = jest.fn();
const mockGetIdentity = jest.fn();
const mockReadStored = jest.fn();
const mockLinkIdentity = jest.fn();
const mockDispatch = jest.fn();
const mockClearLifecycle = jest.fn();
const mockRefreshLifecycles = jest.fn();
const mockSetUserCoins = jest.fn();
const mockFindCoin = jest.fn();

jest.mock('../../../store', () => ({__esModule: true, default: {
  getState: () => mockState,
  dispatch: (...args) => mockDispatch(...args),
}}));
jest.mock('../../vrpc/vrpcInterface', () => ({__esModule: true, default: {
  getEndpoint: jest.fn(() => ({
    getIdentitiesWithAddress: (...args) => mockGetIdentitiesWithAddress(...args),
    getInfo: (...args) => mockGetInfo(...args),
    getIdentity: (...args) => mockGetIdentity(...args),
  })),
}}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {findCoinObj: (...args) => mockFindCoin(...args)}}));
jest.mock('../../api/channels/verusid/requests/getIdentity', () => ({getIdentity: (...args) => mockGetIdentity(...args)}));
jest.mock('../../auth/authBox', () => ({requestServiceStoredData: (...args) => mockReadStored(...args)}));
jest.mock('../../../actions/actions/services/dispatchers/verusid/verusid', () => ({linkVerusId: (...args) => mockLinkIdentity(...args)}));
jest.mock('../../../actions/actionCreators', () => ({setUserCoins: (...args) => mockSetUserCoins(...args)}));
jest.mock('../../../actions/actions/intervals/dispatchers/lifecycleManager', () => ({
  clearChainLifecycle: (...args) => mockClearLifecycle(...args),
  refreshActiveChainLifecycles: (...args) => mockRefreshLifecycles(...args),
}));

const {I_ADDR_VERSION, R_ADDR_VERSION, toBase58Check} = require('verus-typescript-primitives');
const {captureIdentityLinkContext, discoverLinkableIdentities, linkSelectedIdentities, retryIdentityLinkRefresh} = require('../../identityLinking/identityLinking');
const {SET_WATCHED_VERUSIDS} = require('../../constants/storeType');
const VrpcProvider = require('../../vrpc/vrpcInterface').default;
const wallet = toBase58Check(Buffer.alloc(20, 1), R_ADDR_VERSION);
const wallet2 = toBase58Check(Buffer.alloc(20, 2), R_ADDR_VERSION);
const other = toBase58Check(Buffer.alloc(20, 3), R_ADDR_VERSION);
const alice = toBase58Check(Buffer.alloc(20, 4), I_ADDR_VERSION);
const bob = toBase58Check(Buffer.alloc(20, 5), I_ADDR_VERSION);
const carol = toBase58Check(Buffer.alloc(20, 6), I_ADDR_VERSION);
const rootSystem = toBase58Check(Buffer.alloc(20, 7), I_ADDR_VERSION);
const testSystem = toBase58Check(Buffer.alloc(20, 8), I_ADDR_VERSION);
const rootCoin = {id: 'VRSC', system_id: rootSystem, currency_id: rootSystem};
const testCoin = {id: 'VRSCTEST', system_id: testSystem, currency_id: testSystem, testnet: true};
const definition = (identityAddress = alice, extra = {}) => ({
  version: 3,
  identityaddress: identityAddress,
  name: identityAddress === alice ? 'Alice' : identityAddress === bob ? 'Bob' : 'Carol',
  parent: rootSystem,
  systemid: rootSystem,
  primaryaddresses: [wallet],
  minimumsignatures: 1,
  flags: 0,
  timelock: 0,
  txout: {txid: '11'.repeat(32), voutnum: 0},
  ...extra,
});
const stateFor = (accountHash = 'account-a', sessionEpoch = 1) => ({
  authentication: {
    activeAccount: {id: accountHash, accountHash, testnetOverrides: {}, keys: {
      VRSC: {vrpc: {addresses: [wallet]}},
      VRSCTEST: {vrpc: {addresses: [wallet2]}},
    }},
    sessionEpoch,
  },
  coins: {activeCoinsForUser: [rootCoin, testCoin], activeCoinList: [rootCoin]},
});
const deferred = () => {
  let resolve;
  const promise = new Promise(resolvePromise => {resolve = resolvePromise;});
  return {promise, resolve};
};
const discover = async (definitions = [definition()]) => {
  mockGetIdentitiesWithAddress.mockResolvedValue({result: definitions});
  const context = captureIdentityLinkContext();
  return {context, identities: await discoverLinkableIdentities(context)};
};

beforeEach(() => {
  jest.clearAllMocks();
  mockState = stateFor();
  mockSaved = {linked_ids: {VRSC: {}}, registration_jobs: {preserved: true}};
  mockGetInfo.mockResolvedValue({result: {chainid: rootSystem, blocks: 100}});
  mockFindCoin.mockImplementation(chain => chain === 'VRSCTEST' ? testCoin : rootCoin);
  mockReadStored.mockImplementation(async () => mockSaved);
  mockLinkIdentity.mockImplementation(async (id, name, chain) => {
    mockSaved.linked_ids[chain] = {...mockSaved.linked_ids[chain], [id]: name};
  });
  mockSetUserCoins.mockReturnValue({type: 'SET_USER_COINS', payload: {activeCoinsForUser: [rootCoin]}});
});

test('discovers current address-index matches, deduplicates and marks only same-network saved links', async () => {
  mockSaved.linked_ids.VRSC[bob] = 'Bob@';
  mockSaved.linked_ids.VRSCTEST = {[alice]: 'Alice@'};
  const {context, identities} = await discover([
    definition(bob), definition(), {identity: definition()}, null, {identityaddress: 'invalid'},
  ]);
  expect(context.chain).toBe('VRSC');
  expect(context.walletAddresses).toEqual([wallet]);
  expect(VrpcProvider.getEndpoint).toHaveBeenCalledWith(rootSystem);
  expect(mockGetIdentitiesWithAddress).toHaveBeenCalledWith({address: wallet, unspent: true});
  expect(mockGetIdentity).not.toHaveBeenCalled();
  expect(identities).toEqual([
    expect.objectContaining({identityAddress: alice, displayName: 'Alice', linked: false, canControl: true}),
    expect.objectContaining({identityAddress: bob, displayName: 'Bob', linked: true, canControl: true}),
  ]);
});

test('uses the index name without inventing its parent namespace or fetching more identity data', async () => {
  const {identities} = await discover([
    definition(alice, {parent: carol}),
    definition(bob, {fullyqualifiedname: 'Bob.VRSC@'}),
    definition(carol, {name: ''}),
  ]);
  expect(identities.find(row => row.identityAddress === alice).displayName).toBe('Alice');
  expect(identities.find(row => row.identityAddress === bob).displayName).toBe('Bob@');
  expect(identities.find(row => row.identityAddress === carol).displayName).toBe(carol);
  expect(mockGetIdentity).not.toHaveBeenCalled();
});

test('uses testnet by default for a testnet account and rejects the other network', () => {
  mockState.authentication.activeAccount.testnetOverrides = {enabled: true};
  expect(captureIdentityLinkContext()).toMatchObject({chain: 'VRSCTEST', systemId: testSystem, walletAddresses: [wallet2], isTestnet: true});
  expect(() => captureIdentityLinkContext('VRSC')).toThrow('Choose an identity network');
  expect(captureIdentityLinkContext(testSystem).chain).toBe('VRSCTEST');
});

test('requires an active transparent wallet and never queries with an identity address', () => {
  mockState.authentication.activeAccount.keys.VRSC.vrpc.addresses = [alice];
  expect(() => captureIdentityLinkContext()).toThrow('transparent wallet');
  expect(mockGetIdentitiesWithAddress).not.toHaveBeenCalled();
});

test('allows 1-of-2 with one wallet key but excludes 2-of-2 and duplicate-key thresholds', async () => {
  const {identities} = await discover([
    definition(alice, {primaryaddresses: [wallet, other], minimumsignatures: 2}),
    definition(bob, {primaryaddresses: [wallet, wallet], minimumsignatures: 2}),
    definition(carol, {primaryaddresses: [wallet, other], minimumsignatures: 1}),
  ]);
  expect(identities).toEqual([expect.objectContaining({
    identityAddress: carol, minimumSignatures: 1, ownedAddresses: [wallet], canControl: true,
  })]);
  expect(mockGetIdentity).not.toHaveBeenCalled();
});

test.each([0, -1, 1.5, 14, null, undefined, true, '1', NaN, Infinity])(
  'excludes an invalid signature threshold: %s', async minimumsignatures => {
    const {identities} = await discover([definition(alice, {minimumsignatures})]);
    expect(identities).toEqual([]);
  },
);

test('includes 2-of-2 with both wallet keys and excludes revoked or locked identities', async () => {
  mockState.authentication.activeAccount.keys.VRSC.vrpc.addresses.push(wallet2, wallet);
  const {identities} = await discover([
    definition(alice, {primaryaddresses: [wallet, wallet2], minimumsignatures: 2}),
    definition(bob, {flags: 0x8002, timelock: 101}),
    definition(carol, {flags: 2}),
  ]);
  expect(mockGetIdentitiesWithAddress).toHaveBeenCalledTimes(2);
  expect(identities).toEqual([expect.objectContaining({
    identityAddress: alice, minimumSignatures: 2, ownedAddresses: [wallet, wallet2], canControl: true,
  })]);
  expect(mockGetIdentity).not.toHaveBeenCalled();
});

test('ignores index entries without a matching wallet key or valid primary-address list', async () => {
  const {identities} = await discover([
    definition(alice, {primaryaddresses: [other]}),
    definition(bob, {primaryaddresses: null}),
    definition(carol, {primaryaddresses: []}),
  ]);
  expect(identities).toEqual([]);
});

test('only includes timelocked identities after the unlock height has passed', async () => {
  const {identities} = await discover([
    definition(alice, {timelock: 99}),
    definition(bob, {timelock: 100}),
    definition(carol, {timelock: 101}),
  ]);
  expect(identities).toEqual([expect.objectContaining({identityAddress: alice, locked: false})]);
});

test('does not exclude spendable identities solely for tokenized recovery control', async () => {
  const {identities} = await discover([definition(alice, {flags: 4})]);
  expect(identities).toEqual([expect.objectContaining({identityAddress: alice, canControl: true})]);
});

test('uses the latest complete duplicate definition instead of combining signing authority', async () => {
  mockState.authentication.activeAccount.keys.VRSC.vrpc.addresses.push(wallet2);
  mockGetIdentitiesWithAddress
    .mockResolvedValueOnce({result: [definition(alice, {primaryaddresses: [wallet, wallet2], minimumsignatures: 2})]})
    .mockResolvedValueOnce({result: [definition(alice, {primaryaddresses: [wallet2, other], minimumsignatures: 2})]});
  await expect(discoverLinkableIdentities(captureIdentityLinkContext())).resolves.toEqual([]);
  expect(mockGetIdentity).not.toHaveBeenCalled();
});

test('rejects an endpoint serving another network before reading or linking identities', async () => {
  mockGetInfo.mockResolvedValue({result: {chainid: testSystem, blocks: 100}});
  await expect(discoverLinkableIdentities(captureIdentityLinkContext())).rejects.toThrow('different network');
  expect(mockGetIdentitiesWithAddress).not.toHaveBeenCalled();
  expect(mockLinkIdentity).not.toHaveBeenCalled();
});

test('surfaces an unavailable index as an error instead of an empty wallet', async () => {
  mockGetIdentitiesWithAddress.mockResolvedValue({error: {message: 'Requires -idindex=1'}});
  await expect(discoverLinkableIdentities(captureIdentityLinkContext())).rejects.toThrow('Requires -idindex=1');
});

test('stops discovery after an account switch before its RPC returns', async () => {
  const response = deferred();
  mockGetIdentitiesWithAddress.mockReturnValue(response.promise);
  const finding = discoverLinkableIdentities(captureIdentityLinkContext());
  await new Promise(resolve => setImmediate(resolve));
  expect(mockGetIdentitiesWithAddress).toHaveBeenCalledTimes(1);
  mockState = stateFor('account-b', 2);
  response.resolve({result: [definition()]});
  await expect(finding).rejects.toMatchObject({code: 'SESSION_CHANGED'});
  expect(mockGetIdentity).not.toHaveBeenCalled();
  expect(mockReadStored).not.toHaveBeenCalled();
});

test('links multiple identities through the existing writer and refreshes wallet state once', async () => {
  const {context, identities} = await discover([definition(), definition(bob)]);
  const result = await linkSelectedIdentities({context, identities: [...identities, identities[0]]});
  expect(result).toEqual({linked: identities, failed: [], refreshError: null});
  expect(mockLinkIdentity).toHaveBeenCalledTimes(2);
  expect(mockLinkIdentity).toHaveBeenNthCalledWith(1, alice, 'Alice', 'VRSC', context);
  expect(mockLinkIdentity).toHaveBeenNthCalledWith(2, bob, 'Bob', 'VRSC', context);
  expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
    type: SET_WATCHED_VERUSIDS,
    payload: {watchedVerusIds: {VRSC: {[alice]: 'Alice', [bob]: 'Bob'}}},
    meta: context.sessionScope,
  }));
  expect(mockSetUserCoins).toHaveBeenCalledWith(mockState.coins.activeCoinList, 'account-a');
  expect(mockClearLifecycle).toHaveBeenCalledTimes(1);
  expect(mockRefreshLifecycles).toHaveBeenCalledTimes(1);
  expect(mockSaved.registration_jobs).toEqual({preserved: true});
});

test('reports partial failures, keeps successful links, and retries only failed writes', async () => {
  const {context, identities} = await discover([definition(), definition(bob), definition(carol)]);
  const save = mockLinkIdentity.getMockImplementation();
  mockLinkIdentity.mockImplementation(async (...args) => {
    if (args[0] === bob) throw new Error('Storage unavailable');
    return save(...args);
  });
  const result = await linkSelectedIdentities({context, identities});
  expect(result.linked.map(row => row.identityAddress)).toEqual([alice, carol]);
  expect(result.failed).toEqual([{identity: identities[1], error: expect.objectContaining({message: 'Storage unavailable'})}]);
  expect(mockSaved.linked_ids.VRSC).toEqual({[alice]: 'Alice', [carol]: 'Carol'});
  mockLinkIdentity.mockImplementation(save);
  const retry = await linkSelectedIdentities({context, identities});
  expect(retry.failed).toEqual([]);
  expect(mockLinkIdentity).toHaveBeenCalledTimes(4);
});

test('a post-save refresh failure does not report saved links as failed', async () => {
  const {context, identities} = await discover();
  mockReadStored.mockRejectedValueOnce(new Error('Refresh unavailable'));
  const result = await linkSelectedIdentities({context, identities});
  expect(result.linked).toEqual(identities);
  expect(result.failed).toEqual([]);
  expect(result.refreshError.message).toBe('Refresh unavailable');
  await retryIdentityLinkRefresh(context);
  expect(mockLinkIdentity).toHaveBeenCalledTimes(1);
  expect(mockRefreshLifecycles).toHaveBeenCalledTimes(1);
});

test('stops further saves and refreshes if the account changes during a write', async () => {
  const {context, identities} = await discover([definition(), definition(bob)]);
  const saved = deferred();
  mockLinkIdentity.mockReturnValue(saved.promise);
  const linking = linkSelectedIdentities({context, identities});
  mockState = stateFor('account-b', 2);
  saved.resolve();
  await expect(linking).rejects.toMatchObject({code: 'SESSION_CHANGED'});
  expect(mockLinkIdentity).toHaveBeenCalledTimes(1);
  expect(mockDispatch).not.toHaveBeenCalled();
  expect(mockRefreshLifecycles).not.toHaveBeenCalled();
});

test.each(['new session', 'new key', 'new network'])('rejects old selections after %s', async change => {
  const {context, identities} = await discover();
  if (change === 'new session') mockState.authentication.sessionEpoch++;
  if (change === 'new key') mockState.authentication.activeAccount.keys.VRSC.vrpc.addresses = [wallet2];
  if (change === 'new network') mockState.authentication.activeAccount.testnetOverrides = {enabled: true};
  await expect(linkSelectedIdentities({context, identities})).rejects.toMatchObject({code: 'SESSION_CHANGED'});
  expect(mockLinkIdentity).not.toHaveBeenCalled();
});

test('rejects copied or mixed-context rows before performing any saves', async () => {
  const {context, identities} = await discover();
  const second = await discover([definition(bob)]);
  await expect(linkSelectedIdentities({context, identities: [identities[0], second.identities[0]]})).rejects.toThrow('discovered for this wallet');
  await expect(linkSelectedIdentities({context, identities: [{...identities[0]}]})).rejects.toThrow('discovered for this wallet');
  expect(mockLinkIdentity).not.toHaveBeenCalled();
});

test('ignores an already-linked selection and prevents concurrent submissions', async () => {
  mockSaved.linked_ids.VRSC[alice] = 'Alice@';
  const {context, identities} = await discover([definition(), definition(bob)]);
  const pending = deferred();
  mockLinkIdentity.mockReturnValue(pending.promise);
  const linking = linkSelectedIdentities({context, identities});
  await expect(linkSelectedIdentities({context, identities})).rejects.toThrow('already being linked');
  expect(mockLinkIdentity).toHaveBeenCalledTimes(1);
  expect(mockLinkIdentity).toHaveBeenCalledWith(bob, 'Bob', 'VRSC', context);
  pending.resolve();
  await linking;
});
