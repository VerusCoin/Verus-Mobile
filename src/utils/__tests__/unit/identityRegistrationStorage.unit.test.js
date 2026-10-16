let mockStoredData;
let mockState;
const mockDispatch = jest.fn();
const mockReconcile = jest.fn();

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {dispatch: mockDispatch, getState: () => mockState},
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
  requestServiceStoredData: jest.fn(async service =>
    JSON.parse(mockStoredData[service] || '{}')),
  requestSeeds: jest.fn(),
}));
jest.mock('../../seedCrypt', () => ({
  decryptkey: jest.fn((_password, value) => value),
  encryptkey: jest.fn(async (_password, value) => value),
}));
jest.mock('../../services/WyreProvider', () => ({
  __esModule: true, default: {reset: jest.fn()},
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
jest.mock('../../identityRegistration/registration', () => ({reconcileRegistration: mockReconcile}));

const {
  saveRegistrationJob,
  getRegistrationJob,
  updateRegistrationJob,
  removeRegistrationJob,
  refreshRegistrationJobs,
  publishRegistrationState,
} = require('../../../actions/actions/services/dispatchers/verusid/registration');
const {
  linkVerusId,
  unlinkVerusId,
  setRequestedVerusId,
  deleteProvisionedIds,
  deleteAllProvisionedIds,
  clearOldPendingVerusIds,
} = require('../../../actions/actions/services/dispatchers/verusid/verusid');
const {VERUSID_SERVICE_ID} = require('../../constants/services');
const {SET_IDENTITY_REGISTRATION_JOBS, SET_WATCHED_VERUSIDS, SIGN_OUT_COMPLETE} = require('../../constants/storeType');
const {channelStore_verusid} = require('../../../reducers/channelStores/verusid');
const {requestServiceStoredData} = require('../../auth/authBox');
const {loadServiceStoredDataForUser, storeServiceStoredDataForUser} = require('../../asyncStore/serviceStoredDataStorage');
const {registrationNotifications} = require('../../identityRegistration/notifications');

const context = () => ({sessionScope: {
  sessionScoped: true,
  accountHash: mockState.authentication.activeAccount.accountHash,
  sessionEpoch: mockState.authentication.sessionEpoch,
}});
const job = (id = 'job-a') => ({
  id,
  accountHash: 'account-a',
  systemId: 'system-a',
  chainTicker: 'VRSC',
  name: 'alice',
  displayName: 'alice@',
  identityAddress: 'iAlice',
  signingAddress: 'R-wallet',
  linked: false,
  status: 'commitment_broadcast',
  reservation: {salt: 'private-salt', bytes: 'private-reservation'},
  commitment: {signedHex: 'private-commitment', txid: 'public-commitment-txid'},
  registration: {signedHex: 'private-reveal'},
  lastError: {rpcData: 'must-never-escape'},
});
const data = () => JSON.parse(mockStoredData[VERUSID_SERVICE_ID]);
const lastSummary = () => mockDispatch.mock.calls.map(([action]) => action)
  .filter(action => action.type === SET_IDENTITY_REGISTRATION_JOBS).pop();

describe('durable identity registration storage', () => {
  let epoch = 0;
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = {authentication: {activeAccount: {accountHash: 'account-a'}, sessionEpoch: ++epoch}};
    mockStoredData = {[VERUSID_SERVICE_ID]: JSON.stringify({linked_ids: {}, pending_ids: {}})};
    requestServiceStoredData.mockImplementation(async service => JSON.parse(mockStoredData[service] || '{}'));
    mockReconcile.mockResolvedValue(undefined);
  });

  it('preserves reservations across every shared service writer and provider cleanup', async () => {
    const first = saveRegistrationJob(job(), context());
    const linking = linkVerusId('iFirst', 'first@', 'VRSC', context());
    const provisioning = setRequestedVerusId('iPending', {createdAt: 1}, 'VRSC', context());
    await Promise.all([first, linking, provisioning]);
    await Promise.all([
      unlinkVerusId('iFirst', 'VRSC', context()),
      saveRegistrationJob(job('job-b'), context()),
      clearOldPendingVerusIds(context()),
      deleteProvisionedIds('iPending', 'VRSC', context()),
      deleteAllProvisionedIds(context()),
    ]);

    expect(data().registration_jobs.version).toBe(1);
    expect(Object.keys(data().registration_jobs.jobs)).toEqual(['job-a', 'job-b']);
    expect(data().registration_jobs.jobs['job-a'].reservation.salt).toBe('private-salt');
    expect(data().linked_ids.VRSC).toEqual({});
    expect(data().pending_ids).toEqual({});
  });

  it('publishes only public fields and clears them on sign-out', async () => {
    await saveRegistrationJob(job(), context());
    const action = lastSummary();
    expect(action.meta.accountHash).toBe('account-a');
    expect(JSON.stringify(action)).not.toMatch(/private|rpcData|must-never-escape/);
    expect(action.payload.registrationJobs['job-a'].commitmentTxid).toBe('public-commitment-txid');
    const state = channelStore_verusid(undefined, action);
    expect(channelStore_verusid(state, {type: SIGN_OUT_COMPLETE}).registrationJobs).toEqual({});
  });

  it('rejects stale revisions and preserves the commitment reservation', async () => {
    const saved = await saveRegistrationJob(job(), context());
    await updateRegistrationJob(saved.id, {status: 'commitment_confirmed'}, context());
    await expect(updateRegistrationJob(saved.id, {...saved, status: 'commitment_broadcast'}, context()))
      .rejects.toMatchObject({code: 'REGISTRATION_CHANGED'});
    await expect(updateRegistrationJob(saved.id, {reservation: {salt: 'replacement'}}, context()))
      .rejects.toThrow('reservation');
    expect((await getRegistrationJob(saved.id, context())).status).toBe('commitment_confirmed');
  });

  it('replaces expired commitment authorization while retaining the complete signed receipt and reservation secret', async () => {
    const expired = {...job(), status: 'commitment_expired', saltHex: 'private-secret',
      reservation: {...job().reservation, authorizationID: 'old-issuer'},
      previousCommitments: [{txid: 'older-txid', signedHex: 'private-older-transaction'}],
    };
    await saveRegistrationJob(expired, context());
    const saved = await updateRegistrationJob(expired.id, {
      status: 'commitment_prepared',
      commitment: {prepared: {txHex: 'private-new-unsigned'}, vout: 0},
      reservation: {...expired.reservation, authorizationID: 'new-issuer'},
      previousCommitments: [...expired.previousCommitments, expired.commitment],
    }, context());
    expect(saved.reservation).toEqual({...expired.reservation, authorizationID: 'new-issuer'});
    expect(saved.saltHex).toBe(expired.saltHex);
    expect(saved.previousCommitments).toEqual([...expired.previousCommitments, expired.commitment]);
    expect(saved.commitment.txid).toBeUndefined();
    expect(JSON.stringify(lastSummary())).not.toMatch(/private|authorizationID/);
  });

  it.each([
    ['a live commitment', {previousStatus: 'commitment_broadcast'}],
    ['a confirmed commitment', {previousStatus: 'commitment_confirmed'}],
    ['the same signed transaction', {keepCommitment: true}],
    ['a replacement that is already signed', {signedHex: 'private-new-signed'}],
    ['a replacement with a transaction ID', {txid: 'new-txid'}],
    ['a missing archived receipt', {history: []}],
    ['an altered archived receipt', {history: [{txid: 'public-commitment-txid', signedHex: 'different'}]}],
    ['different reservation bytes', {reservation: {bytes: 'different-bytes'}}],
    ['a different name', {reservation: {name: 'another-name'}}],
    ['a different reservation salt', {reservation: {salt: 'different-salt'}}],
    ['a different saved salt', {saltHex: 'different-secret'}],
  ])('rejects changed authorization with %s', async (_description, change) => {
    const expired = {...job(), status: change.previousStatus || 'commitment_expired', saltHex: 'private-secret',
      reservation: {...job().reservation, name: 'alice', authorizationID: 'old-issuer'},
    };
    await saveRegistrationJob(expired, context());
    const replacement = {
      status: 'commitment_prepared',
      commitment: change.keepCommitment ? expired.commitment : {
        prepared: {txHex: 'private-new-unsigned'}, vout: 0,
        ...(change.txid ? {txid: change.txid} : {}),
        ...(change.signedHex ? {signedHex: change.signedHex} : {}),
      },
      saltHex: change.saltHex || expired.saltHex,
      reservation: {...expired.reservation, authorizationID: 'new-issuer', ...change.reservation},
      previousCommitments: change.history || [expired.commitment],
    };
    await expect(updateRegistrationJob(expired.id, replacement, context())).rejects.toThrow('reservation');
    expect(await getRegistrationJob(expired.id, context())).toMatchObject({
      status: expired.status, commitment: expired.commitment, reservation: expired.reservation, saltHex: expired.saltHex,
    });
  });

  it('rejects signing secrets and changes to the originating chain', async () => {
    await expect(saveRegistrationJob({...job(), key: {wif: 'secret'}}, context())).rejects.toThrow('Signing secrets');
    await saveRegistrationJob(job(), context());
    await expect(updateRegistrationJob('job-a', {systemId: 'other-system'}, context())).rejects.toThrow('cannot be changed');
  });

  it('deletes an unpaid draft without changing other registrations or linked identities', async () => {
    const saved = await saveRegistrationJob({...job(), status: 'commitment_prepared', registration: undefined,
      commitment: {prepared: {quote: {commitmentFee: '10000'}}}}, context());
    await saveRegistrationJob(job('job-b'), context());
    expect(lastSummary().payload.registrationJobs['job-a']).toMatchObject({deletionKind: 'draft', commitmentFee: '10000'});
    await Promise.all([
      removeRegistrationJob(saved.id, saved.revision, context()),
      linkVerusId('iKeep', 'keep@', 'VRSC', context()),
    ]);
    expect(Object.keys(data().registration_jobs.jobs)).toEqual(['job-b']);
    expect(data().linked_ids.VRSC).toEqual({iKeep: 'keep@'});
    expect(lastSummary().payload.registrationJobs['job-a']).toBeUndefined();
    expect(lastSummary().payload.registrationJobs['job-b']).toBeDefined();
  });

  it('deletes a saved commitment and removes its home notice without unlinking the wallet identity', async () => {
    const saved = await saveRegistrationJob({...job(), registration: undefined,
      commitment: {...job().commitment, prepared: {quote: {commitmentFee: '10000'}}}}, context());
    await linkVerusId('iKeep', 'keep@', 'VRSC', context());
    expect(registrationNotifications(lastSummary().payload.registrationJobs, 'account-a')).toHaveLength(1);
    expect(lastSummary().payload.registrationJobs['job-a']).toMatchObject({deletionKind: 'commitment', commitmentFee: '10000'});
    mockDispatch.mockClear();
    await expect(removeRegistrationJob(saved.id, saved.revision, context())).resolves.toEqual({jobId: saved.id});
    expect(registrationNotifications(lastSummary().payload.registrationJobs, 'account-a')).toEqual([]);
    expect(data().linked_ids.VRSC).toEqual({iKeep: 'keep@'});
    expect(mockDispatch.mock.calls.some(([action]) => action.type === SET_WATCHED_VERUSIDS)).toBe(false);
    expect(mockReconcile).not.toHaveBeenCalled();
  });

  it.each(['registered', 'complete'])('deletes a confirmed %s receipt without deleting its existing wallet link', async status => {
    const saved = await saveRegistrationJob({...job(), status, linked: status === 'complete',
      registration: {signedHex: 'private-confirmed-reveal', txid: 'registration-txid', height: 5, blockHash: 'a'.repeat(64)}}, context());
    await linkVerusId(saved.identityAddress, saved.displayName, 'VRSC', context());
    expect(lastSummary().payload.registrationJobs['job-a'].deletionKind).toBe('completed');
    await removeRegistrationJob(saved.id, saved.revision, context());
    expect(data().registration_jobs.jobs).toEqual({});
    expect(data().linked_ids.VRSC).toEqual({[saved.identityAddress]: saved.displayName});
  });

  it.each(['registered', 'complete'])('retains a malformed %s receipt without its signed commitment', async status => {
    const saved = await saveRegistrationJob({...job(), status, commitment: {txid: 'commitment-txid'},
      registration: {signedHex: 'private-confirmed-reveal', txid: 'registration-txid', height: 5, blockHash: 'a'.repeat(64)}}, context());
    expect(lastSummary().payload.registrationJobs['job-a'].deletionKind).toBeNull();
    storeServiceStoredDataForUser.mockClear();
    await expect(removeRegistrationJob(saved.id, saved.revision, context()))
      .rejects.toMatchObject({code: 'REGISTRATION_NOT_DELETABLE'});
    expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();
    expect(await getRegistrationJob(saved.id, context())).toEqual(saved);
  });

  it.each(['current', 'historical'])('refuses to delete an unconfirmed %s signed registration', async source => {
    const signedRegistration = {signedHex: 'private-reveal', txid: 'possibly-broadcast'};
    const saved = await saveRegistrationJob({...job(), status: 'registration_prepared',
      registration: source === 'current' ? signedRegistration : {prepared: {}},
      previousRegistrations: source === 'historical' ? [signedRegistration] : [],
    }, context());
    storeServiceStoredDataForUser.mockClear();
    await expect(removeRegistrationJob(saved.id, saved.revision, context()))
      .rejects.toMatchObject({code: 'REGISTRATION_NOT_DELETABLE'});
    expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();
    expect(await getRegistrationJob(saved.id, context())).toEqual(saved);
  });

  it('rechecks the exact revision inside the queued deletion', async () => {
    const saved = await saveRegistrationJob({...job(), registration: undefined}, context());
    await updateRegistrationJob(saved.id, {status: 'commitment_confirmed'}, context());
    await expect(removeRegistrationJob(saved.id, saved.revision, context()))
      .rejects.toMatchObject({code: 'REGISTRATION_CHANGED'});
    expect((await getRegistrationJob(saved.id, context())).status).toBe('commitment_confirmed');
  });

  it('abandons deletion when the account changes during the protected storage read', async () => {
    const saved = await saveRegistrationJob({...job(), registration: undefined}, context());
    let finishRead;
    loadServiceStoredDataForUser.mockReturnValueOnce(new Promise(resolve => {finishRead = resolve;}));
    storeServiceStoredDataForUser.mockClear();
    mockDispatch.mockClear();
    const deleting = removeRegistrationJob(saved.id, saved.revision, context());
    await new Promise(resolve => setImmediate(resolve));
    mockState.authentication.activeAccount = {accountHash: 'account-b'};
    mockState.authentication.sessionEpoch++;
    finishRead({...mockStoredData});
    await expect(deleting).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(data().registration_jobs.jobs[saved.id]).toEqual(saved);
  });

  it('drops a protected read completed after the user switches accounts', async () => {
    let completeRead;
    requestServiceStoredData.mockReturnValueOnce(new Promise(resolve => {completeRead = resolve;}));
    const read = getRegistrationJob('job-a', context());
    mockState.authentication.activeAccount = {accountHash: 'account-b'};
    mockState.authentication.sessionEpoch++;
    completeRead({registration_jobs: {version: 1, jobs: {'job-a': job()}}});
    await expect(read).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('keeps previous durable state on a lookup failure and backs off', async () => {
    await saveRegistrationJob(job(), context());
    mockReconcile.mockRejectedValue(new Error('RPC payload with private data'));
    storeServiceStoredDataForUser.mockClear();
    await refreshRegistrationJobs(context());
    await refreshRegistrationJobs(context());
    expect(mockReconcile).toHaveBeenCalledTimes(1);
    expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();
    expect(data().registration_jobs.jobs['job-a'].status).toBe('commitment_broadcast');
    expect(JSON.stringify(lastSummary())).not.toContain('RPC payload');
  });

  it('does not publish a reconciliation result after switching accounts', async () => {
    await saveRegistrationJob(job(), context());
    let completeLookup;
    mockReconcile.mockReturnValueOnce(new Promise(resolve => {completeLookup = resolve;}));
    const pending = refreshRegistrationJobs(context());
    await new Promise(resolve => setImmediate(resolve));
    mockDispatch.mockClear();
    mockState.authentication.activeAccount = {accountHash: 'account-b'};
    mockState.authentication.sessionEpoch++;
    completeLookup();
    await expect(pending).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('rechecks a recent completed receipt and restores its notice after a reorg', async () => {
    await saveRegistrationJob({...job(), status: 'complete', linked: true}, context());
    expect(registrationNotifications(lastSummary().payload.registrationJobs, 'account-a')).toEqual([]);
    mockReconcile.mockImplementationOnce(async (jobId, requestContext) =>
      updateRegistrationJob(jobId, {status: 'registration_broadcast'}, requestContext));
    await refreshRegistrationJobs(context());
    expect(mockReconcile).toHaveBeenCalledWith('job-a', {...context(), registrationBackground: true});
    const notices = registrationNotifications(lastSummary().payload.registrationJobs, 'account-a');
    expect(notices).toHaveLength(1);
    expect(notices[0].statusText).toBe('Registration awaiting confirmation');
  });

  it('keeps registered identities pending explicit linking and rechecks their confirmation', async () => {
    await saveRegistrationJob({...job(), status: 'registered', linked: false}, context());
    mockDispatch.mockClear();
    await refreshRegistrationJobs(context());
    expect(mockReconcile).toHaveBeenCalledWith('job-a', {...context(), registrationBackground: true});
    expect(lastSummary().payload.registrationJobs['job-a']).toMatchObject({status: 'registered', linked: false});
    expect(data().linked_ids).toEqual({});
    expect(mockDispatch.mock.calls.some(([action]) => action.type === SET_WATCHED_VERUSIDS)).toBe(false);
  });

  it('publishes newly linked identities in the originating session without polling', async () => {
    await saveRegistrationJob({...job(), status: 'complete', linked: true}, context());
    await linkVerusId('iAlice', 'alice@', 'VRSC', context());
    await publishRegistrationState(context());
    const actions = mockDispatch.mock.calls.map(([action]) => action);
    expect(actions.find(action => action.type === SET_WATCHED_VERUSIDS)).toMatchObject({
      payload: {watchedVerusIds: {VRSC: {iAlice: 'alice@'}}},
      meta: context().sessionScope,
    });
    expect(mockReconcile).not.toHaveBeenCalled();
  });

  it('keeps the home notice until confirmation, then resumes by job ID alone', async () => {
    await saveRegistrationJob(job(), context());
    let notices = registrationNotifications(lastSummary().payload.registrationJobs, 'account-a');
    expect(notices).toHaveLength(1);
    expect(notices[0].persistent).toBe(true);
    expect(notices[0].statusText).toBe('Name commitment awaiting confirmation');
    await updateRegistrationJob('job-a', {status: 'commitment_confirmed'}, context());
    notices = registrationNotifications(lastSummary().payload.registrationJobs, 'account-a');
    expect(notices[0].body).toBe('Continue registration');
    const navigate = jest.fn();
    notices[0].onAction({navigation: {navigate}});
    expect(navigate).toHaveBeenCalledWith('ServicesHome', {
      screen: 'IdentityRegistration',
      params: {screen: 'IdentityRegistrationProgress', params: {jobId: 'job-a'}},
    });
    expect(registrationNotifications(lastSummary().payload.registrationJobs, 'account-b')).toEqual([]);
    await updateRegistrationJob('job-a', {status: 'complete', linked: true}, context());
    expect(registrationNotifications(lastSummary().payload.registrationJobs, 'account-a')).toEqual([]);
  });
});
