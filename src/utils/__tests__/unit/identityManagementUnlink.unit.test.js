let mockStoredData;
let mockState;
const mockDispatch = jest.fn();
const mockClearLifecycle = jest.fn();
const mockRefreshLifecycles = jest.fn();
const mockSetUserCoins = jest.fn((activeCoinList, accountId) => ({
  type: 'SET_USER_COINS', payload: {activeCoinsForUser: activeCoinList, accountId},
}));

jest.mock('../../../store', () => ({
  __esModule: true, default: {dispatch: mockDispatch, getState: () => mockState},
}));
jest.mock('../../asyncStore/serviceStoredDataStorage', () => ({
  loadServiceStoredDataForUser: jest.fn(async () => ({...mockStoredData})),
  storeServiceStoredDataForUser: jest.fn(async data => {
    await Promise.resolve();
    mockStoredData = {...data};
    return data;
  }),
}));
jest.mock('../../auth/authBox', () => ({
  requestPassword: jest.fn(async () => 'password'),
  requestServiceStoredData: jest.fn(async service => JSON.parse(mockStoredData[service] || '{}')),
  requestSeeds: jest.fn(),
}));
jest.mock('../../seedCrypt', () => ({
  decryptkey: jest.fn((_password, value) => value), encryptkey: jest.fn(async (_password, value) => value),
}));
jest.mock('../../services/WyreProvider', () => ({__esModule: true, default: {reset: jest.fn()}}));
jest.mock('../../../actions/actionCreators', () => ({setUserCoins: mockSetUserCoins}));
jest.mock('../../../actions/actions/intervals/dispatchers/lifecycleManager', () => ({
  clearChainLifecycle: mockClearLifecycle, refreshActiveChainLifecycles: mockRefreshLifecycles,
}));
jest.mock('../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager', () => ({
  updatePendingVerusIds: jest.fn(),
}));
jest.mock('../../../actions/actions/notifications/dispatchers/notifications', () => ({
  dispatchAddNotification: jest.fn(), dispatchRemoveNotification: jest.fn(),
}));
jest.mock('../../api/channels/verusid/callCreators', () => ({getIdentity: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/verifyIdProvisioningResponse', () => ({verifyIdProvisioningResponse: jest.fn()}));
jest.mock('../../CoinData/CoinsList', () => ({coinsList: {}}));
jest.mock('../../keys', () => ({deriveKeyPair: jest.fn()}));

const {nameAndParentAddrToIAddr} = require('verus-typescript-primitives');
const {unlinkUpdatedIdentity} = require('../../identityManagement/unlinkAfterUpdate');
const {linkVerusId} = require('../../../actions/actions/services/dispatchers/verusid/verusid');
const {modifyServiceStoredDataForUser} = require('../../../actions/actions/services/dispatchers/services');
const {requestServiceStoredData} = require('../../auth/authBox');
const {loadServiceStoredDataForUser, storeServiceStoredDataForUser} = require('../../asyncStore/serviceStoredDataStorage');
const {SET_WATCHED_VERUSIDS} = require('../../constants/storeType');
const {VERUSID_SERVICE_ID} = require('../../constants/services');
const ID = nameAndParentAddrToIAddr('transferred');
const OTHER = nameAndParentAddrToIAddr('kept');
const update = {identityAddress: ID, chainTicker: 'VRSC'};
const context = () => ({sessionScope: {
  sessionScoped: true, accountHash: mockState.authentication.activeAccount.accountHash,
  sessionEpoch: mockState.authentication.sessionEpoch,
}});
const data = () => JSON.parse(mockStoredData[VERUSID_SERVICE_ID]);
const watchedActions = () => mockDispatch.mock.calls.map(([action]) => action).filter(action => action.type === SET_WATCHED_VERUSIDS);
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {resolve, promise};
};

describe('unlink after an accepted identity update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = {
      authentication: {activeAccount: {id: 'alice', accountHash: 'account-a'}, sessionEpoch: 1},
      coins: {activeCoinList: [{id: 'VRSC'}]},
    };
    mockStoredData = {[VERUSID_SERVICE_ID]: JSON.stringify({
      linked_ids: {VRSC: {[ID]: 'transferred@', [OTHER]: 'kept@'}, VRSCTEST: {[ID]: 'test@'}},
      registration_jobs: {version: 1, jobs: {saved: {reservation: 'private-reservation'}}},
      pending_ids: {VRSC: {pending: {}}},
    })};
    requestServiceStoredData.mockImplementation(async service => JSON.parse(mockStoredData[service] || '{}'));
    mockRefreshLifecycles.mockImplementation(() => {});
  });

  it('unlinks only the selected network, preserves other records and immediately rebuilds wallet channels', async () => {
    const requestContext = context();
    expect(await unlinkUpdatedIdentity(update, requestContext)).toEqual({unlinked: true});
    expect(data().linked_ids).toEqual({VRSC: {[OTHER]: 'kept@'}, VRSCTEST: {[ID]: 'test@'}});
    expect(data().registration_jobs.jobs.saved.reservation).toBe('private-reservation');
    expect(data().pending_ids).toEqual({VRSC: {pending: {}}});
    expect(watchedActions()).toEqual([expect.objectContaining({
      meta: requestContext.sessionScope, payload: {watchedVerusIds: data().linked_ids},
    })]);
    expect(mockClearLifecycle).toHaveBeenCalledWith('VRSC', undefined, requestContext.sessionScope);
    expect(mockSetUserCoins).toHaveBeenCalledWith(mockState.coins.activeCoinList, 'alice');
    expect(mockRefreshLifecycles).toHaveBeenCalledWith(mockState.coins.activeCoinList);
    expect(JSON.stringify(watchedActions())).not.toContain('private-reservation');
  });

  it('merges concurrent link and registration writes through the existing storage queue', async () => {
    const requestContext = context();
    await Promise.all([
      unlinkUpdatedIdentity(update, requestContext),
      linkVerusId('iNewlyLinked', 'new@', 'VRSC', requestContext),
      modifyServiceStoredDataForUser(current => ({
        ...current,
        registration_jobs: {...current.registration_jobs, jobs: {...current.registration_jobs.jobs, second: {reservation: 'second-secret'}}},
      }), VERUSID_SERVICE_ID, 'account-a', requestContext),
    ]);
    expect(data().linked_ids.VRSC).toEqual({[OTHER]: 'kept@', iNewlyLinked: 'new@'});
    expect(Object.keys(data().registration_jobs.jobs)).toEqual(['saved', 'second']);
  });

  it('can retry local cleanup after wallet refresh fails without restoring the removed link', async () => {
    mockRefreshLifecycles.mockImplementationOnce(() => { throw new Error('refresh failed'); });
    await expect(unlinkUpdatedIdentity(update, context())).rejects.toThrow('refresh failed');
    expect(data().linked_ids.VRSC[ID]).toBeUndefined();
    expect(await unlinkUpdatedIdentity(update, context())).toEqual({unlinked: true});
    expect(data().linked_ids.VRSC).toEqual({[OTHER]: 'kept@'});
    expect(mockRefreshLifecycles).toHaveBeenCalledTimes(2);
  });

  it('rejects a stale or aborted session before touching encrypted storage', async () => {
    const stale = context();
    mockState.authentication.sessionEpoch++;
    await expect(unlinkUpdatedIdentity(update, stale)).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    await expect(unlinkUpdatedIdentity(update, {...context(), signal: {aborted: true}})).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(loadServiceStoredDataForUser).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not publish account A links or rebuild account B after a session switch during the storage read', async () => {
    const reading = deferred();
    const readStarted = deferred();
    requestServiceStoredData.mockImplementationOnce(() => {
      readStarted.resolve();
      return reading.promise;
    });
    const requestContext = context();
    const unlinking = unlinkUpdatedIdentity(update, requestContext);
    await readStarted.promise;
    mockState.authentication = {activeAccount: {id: 'bob', accountHash: 'account-b'}, sessionEpoch: 2};
    reading.resolve(data());
    await expect(unlinking).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(watchedActions()).toEqual([]);
    expect(mockClearLifecycle).not.toHaveBeenCalled();
    expect(mockSetUserCoins).not.toHaveBeenCalled();
  });

  it('uses the current coin list rather than a snapshot captured before the transaction', async () => {
    const requestContext = {...context(), activeCoinList: [{id: 'OLD'}]};
    mockState.coins.activeCoinList = [{id: 'VRSC'}, {id: 'NEW'}];
    await unlinkUpdatedIdentity(update, requestContext);
    expect(mockSetUserCoins).toHaveBeenCalledWith([{id: 'VRSC'}, {id: 'NEW'}], 'alice');
  });

  it('rejects malformed cleanup arguments before writing', async () => {
    await expect(unlinkUpdatedIdentity({...update, identityAddress: 'invalid'}, context())).rejects.toThrow('valid identity address');
    await expect(unlinkUpdatedIdentity({...update, chainTicker: ''}, context())).rejects.toThrow('network');
    expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();
  });
});
