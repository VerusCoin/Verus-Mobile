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
jest.mock('../../identityRegistration/storage', () => {
  const codec = jest.requireActual('../../identityRegistration/storage');
  return {...codec, decodeRegistrationJob: jest.fn(codec.decodeRegistrationJob)};
});

const {
  saveRegistrationJob,
  getRegistrationJobs,
  getRegistrationJob,
  getRegistrationJobSummaries,
  updateRegistrationJob,
  clearRegistrationJobs,
  removeRegistrationJob,
  refreshRegistrationJobs,
  publishRegistrationJobs,
  publishRegistrationState,
} = require('../../../actions/actions/services/dispatchers/verusid/registration');
const {
  linkVerusId,
  unlinkVerusId,
  setRequestedVerusId,
  deleteProvisionedIds,
  deleteAllProvisionedIds,
} = require('../../../actions/actions/services/dispatchers/verusid/verusid');
const {VERUSID_SERVICE_ID} = require('../../constants/services');
const {SET_IDENTITY_REGISTRATION_JOBS, SET_WATCHED_VERUSIDS, SIGN_OUT_COMPLETE, INIT_VERUSID_CHANNEL_START} = require('../../constants/storeType');
const {initVerusIdWallet, updateVerusIdWallet} = jest.requireActual('../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager');
const {channelStore_verusid} = require('../../../reducers/channelStores/verusid');
const {requestServiceStoredData} = require('../../auth/authBox');
const {loadServiceStoredDataForUser, storeServiceStoredDataForUser} = require('../../asyncStore/serviceStoredDataStorage');
const {registrationNotifications} = require('../../identityRegistration/notifications');
const {decodeRegistrationJob, encodeRegistrationJob} = require('../../identityRegistration/storage');
const {makeRegistrationJob, makePreparedRegistration} = require('../../../../debug/fixtures/identityRegistration');

const context = () => ({sessionScope: {
  sessionScoped: true,
  accountHash: mockState.authentication.activeAccount.accountHash,
  sessionEpoch: mockState.authentication.sessionEpoch,
}});
const job = (id = 'job-a') => makeRegistrationJob(id, {
  lastError: {rpcData: 'must-never-escape'},
});
const collection = (jobs = {'job-a': job()}) => ({
  version: 2,
  accountHash: 'account-a',
  jobs: Object.fromEntries(Object.entries(jobs).map(([id, value]) => [id, encodeRegistrationJob(value)])),
});
const data = () => JSON.parse(mockStoredData[VERUSID_SERVICE_ID]);
const storedJob = id => decodeRegistrationJob(data().registration_jobs.jobs[id], {
  id,
  accountHash: 'account-a',
});
const lastSummary = () => mockDispatch.mock.calls.map(([action]) => action)
  .filter(action => action.type === SET_IDENTITY_REGISTRATION_JOBS).pop();
const identityUpdates = [
  ['initialization', requestContext => initVerusIdWallet({
    id: 'VRSC', system_id: job().systemId, vrpc_endpoints: ['https://rpc.example'],
  }, requestContext), INIT_VERUSID_CHANNEL_START],
  ['refresh', updateVerusIdWallet, SET_WATCHED_VERUSIDS],
];

describe('durable identity registration storage', () => {
  let epoch = 0;
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = {authentication: {activeAccount: {accountHash: 'account-a'}, sessionEpoch: ++epoch}};
    mockStoredData = {[VERUSID_SERVICE_ID]: JSON.stringify({linked_ids: {}, pending_ids: {}})};
    requestServiceStoredData.mockImplementation(async service => JSON.parse(mockStoredData[service] || '{}'));
    mockReconcile.mockResolvedValue(undefined);
  });

  it.each([
    ['VRSC', 'alice.VRSC@', 'alice@'],
    ['VRSC', 'alice.vrsc@', 'alice@'],
    ['VRSC', 'subid.dudecoin.VRSC@', 'subid.dudecoin@'],
    ['VRSCTEST', 'Mumble.VRSCTEST@', 'Mumble.VRSCTEST@'],
    ['VRSCTEST', 'subid.dudecoin.VRSCTEST@', 'subid.dudecoin.VRSCTEST@'],
    ['VRSCTEST', 'Child.Parent.VRSCTEST', 'Child.Parent.VRSCTEST@'],
  ])('saves full identity names under their address, dropping only VRSC (%s, %s)', async (chain, fullName, savedName) => {
    const identityAddress = 'i7jpcdr29uBZAee1LC9EeYJcaFX2QPd8sb';
    const existing = {
      linked_ids: {[chain]: {iExisting: 'Existing.Parent@'}},
      pending_ids: {[chain]: {iPending: {createdAt: 1}}},
      registration_jobs: collection(),
    };
    mockStoredData[VERUSID_SERVICE_ID] = JSON.stringify(existing);

    await linkVerusId(identityAddress, fullName, chain, context());

    expect(data()).toEqual({
      ...existing,
      linked_ids: {[chain]: {...existing.linked_ids[chain], [identityAddress]: savedName}},
    });
    expect(require('../../api/channels/verusid/callCreators').getIdentity).not.toHaveBeenCalled();
  });

  it('preserves reservations across every shared service writer and explicit provider deletion', async () => {
    const first = saveRegistrationJob(job(), context());
    const linking = linkVerusId('iFirst', 'first@', 'VRSC', context());
    const provisioning = setRequestedVerusId('iPending', {createdAt: 1}, 'VRSC', context());
    await Promise.all([first, linking, provisioning]);
    await Promise.all([
      unlinkVerusId('iFirst', 'VRSC', context()),
      saveRegistrationJob(job('job-b'), context()),
      deleteProvisionedIds('iPending', 'VRSC', context()),
      deleteAllProvisionedIds(context()),
    ]);

    expect(data().registration_jobs.version).toBe(2);
    expect(data().registration_jobs.accountHash).toBe('account-a');
    expect(Object.keys(data().registration_jobs.jobs)).toEqual(['job-a', 'job-b']);
    const compact = data().registration_jobs.jobs['job-a'];
    expect(compact.pools.plans.every(plan => !Object.prototype.hasOwnProperty.call(plan, 'literal'))).toBe(true);
    expect(JSON.stringify(compact)).not.toContain(job().commitment.signedHex);
    expect(storedJob('job-a').reservation).toEqual(job().reservation);
    expect(data().linked_ids.VRSC).toEqual({});
    expect(data().pending_ids).toEqual({});
  });

  it('reads compact jobs without rewriting them and changes only the job explicitly updated', async () => {
    const original = {...job(), revision: 3, createdAt: 1, updatedAt: 2};
    const untouched = {...job('job-b'), version: 1, revision: 5, createdAt: 3, updatedAt: 4};
    const initial = {
      linked_ids: {VRSC: {iLinked: 'linked@'}},
      pending_ids: {VRSC: {iPending: {createdAt: 1}}},
      registration_jobs: collection({[original.id]: original, [untouched.id]: untouched}),
    };
    mockStoredData[VERUSID_SERVICE_ID] = JSON.stringify(initial);

    expect(await getRegistrationJob(original.id, context())).toEqual(original);
    await publishRegistrationJobs(context());
    expect(data()).toEqual(initial);
    expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();

    const saved = await updateRegistrationJob(original.id, {status: 'commitment_confirmed'}, context());

    expect(data().registration_jobs).toMatchObject({version: 2, accountHash: 'account-a'});
    expect(data().registration_jobs.jobs[original.id].format).toBe(2);
    expect(data().registration_jobs.jobs[untouched.id]).toEqual(initial.registration_jobs.jobs[untouched.id]);
    expect(saved).toMatchObject({version: 1, revision: 4, createdAt: 1, status: 'commitment_confirmed'});
    expect(await getRegistrationJob(original.id, context())).toEqual(saved);
    expect(await getRegistrationJobs(context())).toEqual({[original.id]: saved, [untouched.id]: untouched});
    expect(data().linked_ids).toEqual(initial.linked_ids);
    expect(data().pending_ids).toEqual(initial.pending_ids);
  });

  it('lists, publishes, and chooses reconciliation candidates without expanding full jobs', async () => {
    await saveRegistrationJob(job(), context());
    await saveRegistrationJob(job('job-b'), context());
    decodeRegistrationJob.mockClear();
    storeServiceStoredDataForUser.mockClear();

    const summaries = await getRegistrationJobSummaries(context());
    await publishRegistrationJobs(context());
    await publishRegistrationState(context());
    await refreshRegistrationJobs(context());

    expect(Object.keys(summaries)).toEqual(['job-a', 'job-b']);
    expect(summaries['job-a'].commitmentTxid).toBe(job().commitment.txid);
    expect(JSON.stringify(summaries)).not.toMatch(/private|rpcData|must-never-escape/);
    expect(decodeRegistrationJob).toHaveBeenCalled();
    expect(decodeRegistrationJob.mock.calls.every(([, options]) => options.summaryOnly)).toBe(true);
    expect(mockReconcile).toHaveBeenCalledTimes(2);
    expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();
  });

  it('expands only the selected job during a protected read or update', async () => {
    const saved = await saveRegistrationJob(job(), context());
    await saveRegistrationJob(job('job-b'), context());
    const untouched = data().registration_jobs.jobs['job-b'];
    decodeRegistrationJob.mockClear();

    expect(await getRegistrationJob(saved.id, context())).toEqual(saved);
    expect(decodeRegistrationJob.mock.calls.filter(([, options]) => !options.summaryOnly)
      .map(([, options]) => options.id)).toEqual([saved.id]);
    decodeRegistrationJob.mockClear();

    await updateRegistrationJob(saved.id, {status: 'commitment_confirmed'}, context());

    expect(decodeRegistrationJob.mock.calls.filter(([, options]) => !options.summaryOnly)
      .map(([, options]) => options.id)).toEqual([saved.id]);
    expect(data().registration_jobs.jobs['job-b']).toEqual(untouched);
  });

  it.each([1, 2])('rejects unencoded jobs inside version %i collections on both read and write', async version => {
    const initial = {
      linked_ids: {},
      pending_ids: {},
      registration_jobs: {
        version,
        ...(version === 2 ? {accountHash: 'account-a'} : {}),
        jobs: {'job-a': job(), 'job-b': {...job('job-b'), accountHash: 'account-b'}},
      },
    };
    mockStoredData[VERUSID_SERVICE_ID] = JSON.stringify(initial);

    await expect(getRegistrationJob('job-a', context())).rejects.toThrow(/registration/i);
    await expect(saveRegistrationJob(job('job-c'), context())).rejects.toThrow(/registration/i);

    expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(data()).toEqual(initial);
  });

  it('rejects a collection bound to another account and mismatched compact job bindings', async () => {
    mockStoredData[VERUSID_SERVICE_ID] = JSON.stringify({
      registration_jobs: {...collection(), accountHash: 'account-b'},
    });
    await expect(getRegistrationJob('job-a', context())).rejects.toThrow(/account/i);

    const wrongId = collection();
    wrongId.jobs['job-a'].values.id = 'job-b';
    mockStoredData[VERUSID_SERVICE_ID] = JSON.stringify({registration_jobs: wrongId});
    await expect(getRegistrationJob('job-a', context())).rejects.toThrow(/ID|match/i);

    const wrongAccount = collection();
    wrongAccount.jobs['job-a'].values.accountHash = 'account-b';
    mockStoredData[VERUSID_SERVICE_ID] = JSON.stringify({registration_jobs: wrongAccount});
    await expect(getRegistrationJob('job-a', context())).rejects.toThrow(/account/i);
    await expect(saveRegistrationJob(job('job-c'), context())).rejects.toThrow(/account/i);
    expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it.each([
    ['empty', {}],
    ['older than seven days', {
      VRSC: {
        iPending: {createdAt: 1, status: 'NOTIFICATION_TYPE_VERUSID_PENDING'},
        iReady: {createdAt: 1, status: 'NOTIFICATION_TYPE_VERUSID_READY'},
      },
      VRSCTEST: {
        iError: {createdAt: 1, status: 'NOTIFICATION_TYPE_VERUSID_ERROR'},
      },
    }],
  ])('initializes wallets with %s pending IDs without removing records or rewriting storage', async (_label, pendingIds) => {
    const stored = {
      linked_ids: {VRSC: {iLinked: 'linked@'}},
      pending_ids: pendingIds,
      registration_jobs: collection(),
    };
    mockStoredData = {[VERUSID_SERVICE_ID]: JSON.stringify(stored)};

    await initVerusIdWallet({
      id: 'VRSC', system_id: 'system-a', vrpc_endpoints: ['https://rpc.example'],
    }, context());

    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: INIT_VERUSID_CHANNEL_START,
      payload: expect.objectContaining({pendingIds, watchedVerusIds: stored.linked_ids}),
    }));
    expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();
    expect(data()).toEqual(stored);
    expect(lastSummary().payload.registrationJobs['job-a'].status).toBe('commitment_broadcast');
  });

  describe.each(identityUpdates)('optional registration summaries during identity %s', (_name, update, actionType) => {
    it.each(['unsupported collection', 'invalid compact receipt'])('retains all saved data and keeps identities available with an %s', async failure => {
      const saved = {
        linked_ids: {VRSC: {iLinked: 'linked@'}},
        pending_ids: {VRSC: {iPending: {createdAt: 1, status: 'pending'}}},
        registration_jobs: failure === 'unsupported collection'
          ? {version: 1, jobs: {'job-a': {privateReceipt: 'protected registration data'}}}
          : collection(),
      };
      if (failure === 'invalid compact receipt') {
        const record = saved.registration_jobs.jobs['job-a'];
        record.pools.transactions[record.commitment.signedHex] = 'private-receipt-data';
      }
      mockStoredData[VERUSID_SERVICE_ID] = JSON.stringify(saved);
      const protectedData = mockStoredData[VERUSID_SERVICE_ID];
      const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        await expect(update(context())).resolves.toBeUndefined();

        expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
          type: actionType,
          payload: expect.objectContaining({watchedVerusIds: saved.linked_ids}),
        }));
        if (actionType === INIT_VERUSID_CHANNEL_START) {
          expect(mockDispatch.mock.calls.find(([action]) => action.type === actionType)[0].payload.pendingIds)
            .toEqual(saved.pending_ids);
        }
        expect(lastSummary()).toBeUndefined();
        expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();
        expect(mockStoredData[VERUSID_SERVICE_ID]).toBe(protectedData);
        expect(warning.mock.calls).toEqual([['Unable to refresh saved identity registration summaries.']]);
        await expect(getRegistrationJob('job-a', context())).rejects.toThrow();
      } finally {
        warning.mockRestore();
      }
    });

    it('publishes supported compact registrations normally', async () => {
      mockStoredData[VERUSID_SERVICE_ID] = JSON.stringify({
        linked_ids: {VRSC: {iLinked: 'linked@'}}, pending_ids: {}, registration_jobs: collection(),
      });
      const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        await update(context());

        expect(lastSummary().payload.registrationJobs['job-a'].commitmentTxid).toBe(job().commitment.txid);
        expect(warning).not.toHaveBeenCalled();
        expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();
      } finally {
        warning.mockRestore();
      }
    });

    it('still rejects the mandatory service-data read before initializing identities', async () => {
      const readError = new Error('Unable to decrypt service data');
      requestServiceStoredData.mockRejectedValueOnce(readError);

      await expect(update(context())).rejects.toBe(readError);

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();
    });

    it.each(['account change', 'abort signal'])('still rejects an %s during optional summary loading', async reason => {
      const signal = {aborted: false};
      const requestContext = {...context(), signal};
      let finishRead;
      requestServiceStoredData
        .mockResolvedValueOnce(data())
        .mockReturnValueOnce(new Promise(resolve => {finishRead = resolve;}));
      const pending = update(requestContext);
      await new Promise(resolve => setImmediate(resolve));
      mockDispatch.mockClear();

      if (reason === 'account change') {
        mockState.authentication.activeAccount = {accountHash: 'account-b'};
        mockState.authentication.sessionEpoch++;
      } else {
        signal.aborted = true;
      }
      finishRead({registration_jobs: collection()});

      await expect(pending).rejects.toMatchObject({code: 'SESSION_CHANGED'});
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();
    });

    it('propagates an AbortError raised by optional summary loading', async () => {
      const aborted = Object.assign(new Error('Aborted'), {name: 'AbortError'});
      requestServiceStoredData.mockResolvedValueOnce(data()).mockRejectedValueOnce(aborted);

      await expect(update(context())).rejects.toBe(aborted);

      expect(lastSummary()).toBeUndefined();
      expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();
    });
  });

  it('publishes only public fields and clears them on sign-out', async () => {
    await saveRegistrationJob(job(), context());
    const action = lastSummary();
    expect(action.meta.accountHash).toBe('account-a');
    expect(JSON.stringify(action)).not.toMatch(/private|rpcData|must-never-escape/);
    expect(JSON.stringify(action)).not.toContain(job().reservation.reservationHex);
    expect(JSON.stringify(action)).not.toContain(job().commitment.signedHex);
    expect(action.payload.registrationJobs['job-a'].commitmentTxid).toBe(job().commitment.txid);
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

  it('accepts an unchanged reservation reconstructed in a different object-key order', async () => {
    const reservation = {...job().reservation, authorizationID: 'issuer'};
    await saveRegistrationJob({...job(), reservation}, context());

    const saved = await updateRegistrationJob('job-a', {
      reservation: Object.fromEntries(Object.entries(reservation).reverse()),
    }, context());

    expect(saved.reservation).toEqual(reservation);
    expect((await getRegistrationJob(saved.id, context())).reservation).toEqual(reservation);
  });

  it('replaces expired commitment authorization while retaining the complete signed receipt and reservation secret', async () => {
    const expired = {...job(), status: 'commitment_expired',
      reservation: {...job().reservation, authorizationID: 'old-issuer'},
      previousCommitments: [{...job().commitment, height: 3}],
    };
    await saveRegistrationJob(expired, context());
    const saved = await updateRegistrationJob(expired.id, {
      status: 'commitment_prepared',
      commitment: {prepared: makePreparedRegistration(), vout: 0},
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
    const expired = {...job(), status: change.previousStatus || 'commitment_expired',
      reservation: {...job().reservation, name: 'alice', authorizationID: 'old-issuer'},
    };
    await saveRegistrationJob(expired, context());
    const replacement = {
      status: 'commitment_prepared',
      commitment: change.keepCommitment ? expired.commitment : {
        prepared: makePreparedRegistration(), vout: 0,
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

  it.each([
    ['unsupported', {version: 1, jobs: {'old-job': {privateReceipt: 'retain-until-confirmed'}}}],
    ['corrupt', {version: 2, accountHash: 'account-a', jobs: {'broken-job': {format: 2}}}],
  ])('explicitly clears an %s registration collection without decoding or clearing other service data', async (_label, registrationJobs) => {
    const remaining = {
      linked_ids: {VRSC: {iKeep: 'keep@'}},
      pending_ids: {VRSCTEST: {iPending: {createdAt: 1}}},
      other_settings: {enabled: true},
    };
    mockStoredData[VERUSID_SERVICE_ID] = JSON.stringify({...remaining, registration_jobs: registrationJobs});
    mockStoredData.otherService = 'unrelated encrypted service data';

    await expect(clearRegistrationJobs(context())).resolves.toEqual({});

    expect(decodeRegistrationJob).not.toHaveBeenCalled();
    expect(data()).toEqual(remaining);
    expect(mockStoredData.otherService).toBe('unrelated encrypted service data');
    expect(storeServiceStoredDataForUser).toHaveBeenCalledWith(mockStoredData, 'account-a');
    expect(lastSummary()).toEqual({
      type: SET_IDENTITY_REGISTRATION_JOBS,
      payload: {registrationJobs: {}},
      meta: context().sessionScope,
    });
    expect(mockDispatch.mock.calls.some(([action]) => action.type === SET_WATCHED_VERUSIDS)).toBe(false);
    expect(mockReconcile).not.toHaveBeenCalled();
  });

  it('can save and resume a new compact registration after clearing an unsupported collection', async () => {
    mockStoredData[VERUSID_SERVICE_ID] = JSON.stringify({
      linked_ids: {}, pending_ids: {}, registration_jobs: {version: 1, jobs: {}},
    });

    await clearRegistrationJobs(context());
    const saved = await saveRegistrationJob(job(), context());

    expect(data().registration_jobs).toMatchObject({
      version: 2,
      accountHash: 'account-a',
      jobs: {'job-a': {format: 2}},
    });
    await expect(getRegistrationJob(saved.id, context())).resolves.toEqual(saved);
    expect(lastSummary().payload.registrationJobs[saved.id]).toMatchObject({id: saved.id});
  });

  it('serializes registration reset with identity link and provider-request writes', async () => {
    mockStoredData[VERUSID_SERVICE_ID] = JSON.stringify({
      linked_ids: {}, pending_ids: {}, registration_jobs: {version: 1, jobs: {}},
    });

    await Promise.all([
      linkVerusId('iKeep', 'keep@', 'VRSC', context()),
      clearRegistrationJobs(context()),
      setRequestedVerusId('iPending', {createdAt: 1}, 'VRSC', context()),
    ]);

    expect(data()).toEqual({
      linked_ids: {VRSC: {iKeep: 'keep@'}},
      pending_ids: {VRSC: {iPending: {createdAt: 1}}},
    });
  });

  it('publishes an empty registration list only after the reset is durable', async () => {
    await saveRegistrationJob(job(), context());
    const original = mockStoredData[VERUSID_SERVICE_ID];
    let finishWrite;
    storeServiceStoredDataForUser.mockImplementationOnce(next => new Promise(resolve => {
      finishWrite = () => {
        mockStoredData = {...next};
        resolve(next);
      };
    }));
    mockDispatch.mockClear();

    const clearing = clearRegistrationJobs(context());
    await new Promise(resolve => setImmediate(resolve));
    expect(mockStoredData[VERUSID_SERVICE_ID]).toBe(original);
    expect(mockDispatch).not.toHaveBeenCalled();

    finishWrite();
    await clearing;
    expect(data().registration_jobs).toBeUndefined();
    expect(lastSummary().payload.registrationJobs).toEqual({});
  });

  it('preserves registration data and summaries when reset persistence fails', async () => {
    await saveRegistrationJob(job(), context());
    const original = mockStoredData[VERUSID_SERVICE_ID];
    storeServiceStoredDataForUser.mockRejectedValueOnce(new Error('Storage unavailable'));
    mockDispatch.mockClear();

    await expect(clearRegistrationJobs(context())).rejects.toThrow('Storage unavailable');

    expect(mockStoredData[VERUSID_SERVICE_ID]).toBe(original);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it.each(['account switch', 'abort'])('abandons reset after a protected read interrupted by %s', async interruption => {
    await saveRegistrationJob(job(), context());
    const original = mockStoredData[VERUSID_SERVICE_ID];
    let finishRead;
    loadServiceStoredDataForUser.mockReturnValueOnce(new Promise(resolve => {finishRead = resolve;}));
    storeServiceStoredDataForUser.mockClear();
    mockDispatch.mockClear();
    const requestContext = {...context(), signal: {aborted: false}};

    const clearing = clearRegistrationJobs(requestContext);
    await new Promise(resolve => setImmediate(resolve));
    if (interruption === 'account switch') {
      mockState.authentication.activeAccount = {accountHash: 'account-b'};
      mockState.authentication.sessionEpoch++;
    } else {
      requestContext.signal.aborted = true;
    }
    finishRead({...mockStoredData});

    await expect(clearing).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockStoredData[VERUSID_SERVICE_ID]).toBe(original);
  });

  it('never publishes reset results into an account switched during persistence', async () => {
    await saveRegistrationJob(job(), context());
    let finishWrite;
    storeServiceStoredDataForUser.mockImplementationOnce(next => new Promise(resolve => {
      finishWrite = () => {
        mockStoredData = {...next};
        resolve(next);
      };
    }));
    mockDispatch.mockClear();

    const clearing = clearRegistrationJobs(context());
    await new Promise(resolve => setImmediate(resolve));
    mockState.authentication.activeAccount = {accountHash: 'account-b'};
    mockState.authentication.sessionEpoch++;
    finishWrite();

    await expect(clearing).rejects.toMatchObject({code: 'SESSION_CHANGED'});
    expect(storeServiceStoredDataForUser).toHaveBeenLastCalledWith(mockStoredData, 'account-a');
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not recreate cleared jobs when an earlier background lookup completes', async () => {
    await saveRegistrationJob(job(), context());
    let finishLookup;
    mockReconcile.mockImplementationOnce(async (jobId, requestContext) => {
      await new Promise(resolve => {finishLookup = resolve;});
      await updateRegistrationJob(jobId, {status: 'commitment_confirmed'}, requestContext);
    });
    const refreshing = refreshRegistrationJobs(context());
    await new Promise(resolve => setImmediate(resolve));

    await clearRegistrationJobs(context());
    finishLookup();
    await refreshing;

    expect(data().registration_jobs).toBeUndefined();
    expect(lastSummary().payload.registrationJobs).toEqual({});
    expect(registrationNotifications(lastSummary().payload.registrationJobs, 'account-a')).toEqual([]);
  });

  it.each([
    ['all jobs', getRegistrationJobs],
    ['selected job', requestContext => getRegistrationJob('job-a', requestContext)],
    ['summaries', getRegistrationJobSummaries],
    ['publication', publishRegistrationJobs],
    ['combined publication', publishRegistrationState],
    ['refresh', refreshRegistrationJobs],
  ])('rejects an earlier %s read completed after registration reset', async (_label, read) => {
    await saveRegistrationJob(job(), context());
    const previous = data();
    let finishRead;
    requestServiceStoredData.mockReturnValueOnce(new Promise(resolve => {finishRead = resolve;}));

    const pending = read(context());
    await clearRegistrationJobs(context());
    mockDispatch.mockClear();
    decodeRegistrationJob.mockClear();
    finishRead(previous);

    await expect(pending).rejects.toMatchObject({code: 'REGISTRATION_CHANGED'});
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(decodeRegistrationJob).not.toHaveBeenCalled();
    expect(data().registration_jobs).toBeUndefined();
  });

  it('clears reconciliation backoff with the registration collection', async () => {
    await saveRegistrationJob(job(), context());
    await refreshRegistrationJobs(context());
    await clearRegistrationJobs(context());
    await saveRegistrationJob(job(), context());
    await refreshRegistrationJobs(context());

    expect(mockReconcile).toHaveBeenCalledTimes(2);
  });

  it('deletes an unpaid draft without changing other registrations or linked identities', async () => {
    const saved = await saveRegistrationJob({...job(), status: 'commitment_prepared', registration: undefined,
      commitment: {prepared: makePreparedRegistration()}}, context());
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
    const saved = await saveRegistrationJob({...job(), registration: undefined}, context());
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
      registration: {...job().commitment, height: 5, blockHash: 'a'.repeat(64)}}, context());
    await linkVerusId(saved.identityAddress, saved.displayName, 'VRSC', context());
    expect(lastSummary().payload.registrationJobs['job-a'].deletionKind).toBe('completed');
    await removeRegistrationJob(saved.id, saved.revision, context());
    expect(data().registration_jobs.jobs).toEqual({});
    expect(data().linked_ids.VRSC).toEqual({[saved.identityAddress]: saved.displayName});
  });

  it.each(['registered', 'complete'])('retains a malformed %s receipt without its signed commitment', async status => {
    const saved = await saveRegistrationJob({...job(), status,
      registration: {...job().commitment, height: 5, blockHash: 'a'.repeat(64)}}, context());
    const corrupted = data();
    const commitment = corrupted.registration_jobs.jobs[saved.id].commitment;
    commitment.values.txid = saved.commitment.txid;
    delete commitment.signedHex;
    mockStoredData[VERUSID_SERVICE_ID] = JSON.stringify(corrupted);
    await publishRegistrationJobs(context());
    expect(lastSummary().payload.registrationJobs['job-a'].deletionKind).toBeNull();
    storeServiceStoredDataForUser.mockClear();
    await expect(removeRegistrationJob(saved.id, saved.revision, context()))
      .rejects.toMatchObject({code: 'REGISTRATION_NOT_DELETABLE'});
    expect(storeServiceStoredDataForUser).not.toHaveBeenCalled();
    expect(await getRegistrationJob(saved.id, context())).toEqual({
      ...saved, commitment: {...saved.commitment, signedHex: undefined},
    });
  });

  it.each(['current', 'historical'])('refuses to delete an unconfirmed %s signed registration', async source => {
    const signedRegistration = job().commitment;
    const saved = await saveRegistrationJob({...job(), status: 'registration_prepared',
      registration: source === 'current' ? signedRegistration : {prepared: makePreparedRegistration()},
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
    expect(storedJob(saved.id)).toEqual(saved);
  });

  it('drops a protected read completed after the user switches accounts', async () => {
    let completeRead;
    requestServiceStoredData.mockReturnValueOnce(new Promise(resolve => {completeRead = resolve;}));
    const read = getRegistrationJob('job-a', context());
    mockState.authentication.activeAccount = {accountHash: 'account-b'};
    mockState.authentication.sessionEpoch++;
    completeRead({registration_jobs: collection()});
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
    expect(storedJob('job-a').status).toBe('commitment_broadcast');
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
