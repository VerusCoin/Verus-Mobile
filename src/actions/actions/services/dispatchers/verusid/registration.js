import store from '../../../../../store';
import {requestServiceStoredData} from '../../../../../utils/auth/authBox';
import {VERUSID_SERVICE_ID} from '../../../../../utils/constants/services';
import {
  SET_IDENTITY_REGISTRATION_JOBS,
  SET_WATCHED_VERUSIDS,
} from '../../../../../utils/constants/storeType';
import {modifyServiceStoredDataForUser} from '../services';
import {
  registrationCommitmentFee,
  registrationDeletionKind,
} from '../../../../../utils/identityRegistration/deletion';
import {
  decodeRegistrationJob,
  encodeRegistrationJob,
  registrationStorageEqual,
} from '../../../../../utils/identityRegistration/storage';
import {
  captureSessionScope,
  scopeSessionAction,
  sessionScopeIsCurrent,
} from '../../../updates/sessionRequests';

const JOB_VERSION = 1;
const COLLECTION_VERSION = 2;
let registrationResetRevision = 0;

export const captureRegistrationContext = requestContext => ({
  ...(requestContext || {}),
  sessionScope:
    requestContext?.sessionScope ||
    (requestContext?.sessionScoped ? requestContext : null) ||
    captureSessionScope(store.getState()),
});

export const assertRegistrationSession = requestContext => {
  const context = captureRegistrationContext(requestContext);

  if (
    context.signal?.aborted ||
    !context.sessionScope.accountHash ||
    !sessionScopeIsCurrent(store.getState(), context.sessionScope)
  ) {
    const error = new Error('Account changed while identity registration was in progress.');
    error.code = 'SESSION_CHANGED';
    throw error;
  }
  return context;
};

const readCollection = (data, context) => {
  const collection = data.registration_jobs;
  if (collection == null) return {storedJobs: {}, jobs: {}};

  if (
    collection.version !== COLLECTION_VERSION ||
    !collection.jobs ||
    typeof collection.jobs !== 'object' ||
    Array.isArray(collection.jobs)
  ) {
    throw new Error('Unsupported identity registration storage format.');
  }

  if (collection.accountHash !== context.sessionScope.accountHash) {
    throw new Error('Identity registration belongs to another account.');
  }

  // Validate every compact record's account and ID without expanding its
  // transaction inputs and outputs merely to publish a list or choose polling.
  const jobs = Object.keys(collection.jobs).reduce((result, id) => {
    if (collection.jobs[id]?.format !== COLLECTION_VERSION) {
      throw new Error('Invalid compact identity registration record.');
    }
    result[id] = readStoredJob(collection.jobs[id], id, context, true);
    return result;
  }, {});

  return {storedJobs: collection.jobs, jobs};
};

const assertJobAccount = (job, context) => {
  if (job.accountHash !== context.sessionScope.accountHash) {
    throw new Error('Identity registration belongs to another account.');
  }
};

const readStoredJob = (record, id, context, summaryOnly = false) => {
  const job = decodeRegistrationJob(record, {
    id,
    accountHash: context.sessionScope.accountHash,
    summaryOnly,
  });
  assertJobAccount(job, context);

  if (job.id !== id) throw new Error('Identity registration record does not match its ID.');
  return job;
};

// Use an allowlist: reservation preimages, signed reveal bytes, approval data,
// error payloads and input descriptors must never enter Redux or navigation.
const publicString = value => typeof value === 'string' ? value : undefined;
const publicTimestamp = value =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export const summarizeRegistrationJob = job => ({
  id: publicString(job.id),
  accountHash: publicString(job.accountHash),
  systemId: publicString(job.systemId),
  chainTicker: publicString(job.chainTicker),
  status: publicString(job.status),
  linked: job.linked === true,
  deletionKind: registrationDeletionKind(job),
  commitmentFee: registrationCommitmentFee(job),
  name: publicString(job.name),
  displayName: publicString(job.displayName),
  identityAddress: publicString(job.identityAddress),
  createdAt: publicTimestamp(job.createdAt),
  updatedAt: publicTimestamp(job.updatedAt),
  commitmentTxid: publicString(job.commitment?.txid),
  registrationTxid: publicString(job.registration?.txid),
});

const publishCollection = (jobs, context) => {
  assertRegistrationSession(context);

  const summaries = Object.keys(jobs).reduce((result, id) => {
    assertJobAccount(jobs[id], context);
    result[id] = summarizeRegistrationJob(jobs[id]);
    return result;
  }, {});

  store.dispatch(scopeSessionAction({
    type: SET_IDENTITY_REGISTRATION_JOBS,
    payload: {registrationJobs: summaries},
  }, context.sessionScope));

  return summaries;
};

const readRegistrationData = async (context, read) => {
  const resetRevision = registrationResetRevision;
  const data = await requestServiceStoredData(VERUSID_SERVICE_ID);
  assertRegistrationSession(context);

  // A protected read may finish with a snapshot captured before a reset.
  // Read and publish synchronously after this check so old notices cannot return.
  if (resetRevision !== registrationResetRevision) {
    const error = new Error('Identity registration data was cleared. Please reload.');
    error.code = 'REGISTRATION_CHANGED';
    throw error;
  }

  return read(data);
};

const loadCollection = (context, read) =>
  readRegistrationData(context, data => read(readCollection(data, context)));

export const getRegistrationJobs = async requestContext => {
  const context = assertRegistrationSession(requestContext);

  return loadCollection(context, ({storedJobs}) => Object.keys(storedJobs).reduce((result, id) => {
    result[id] = readStoredJob(storedJobs[id], id, context);
    return result;
  }, {}));
};

// Name searches and list screens need only public metadata. Decode the selected
// full job separately when a user opens it or an operation needs its receipt.
export const getRegistrationJobSummaries = async requestContext => {
  const context = assertRegistrationSession(requestContext);

  return loadCollection(context, ({jobs}) => Object.keys(jobs).reduce((result, id) => {
    result[id] = summarizeRegistrationJob(jobs[id]);
    return result;
  }, {}));
};

export const getRegistrationJob = async (jobId, requestContext) => {
  const context = assertRegistrationSession(requestContext);

  return loadCollection(context, ({storedJobs}) => {
    if (!Object.prototype.hasOwnProperty.call(storedJobs, jobId)) {
      throw new Error('Identity registration was not found in this wallet.');
    }

    return readStoredJob(storedJobs[jobId], jobId, context);
  });
};

export const publishRegistrationJobs = async requestContext => {
  const context = assertRegistrationSession(requestContext);
  return loadCollection(context, ({jobs}) => publishCollection(jobs, context));
};

export const publishRegistrationState = async requestContext => {
  const context = assertRegistrationSession(requestContext);

  return readRegistrationData(context, data => {
    const summaries = publishCollection(readCollection(data, context).jobs, context);

    store.dispatch(scopeSessionAction({
      type: SET_WATCHED_VERUSIDS,
      payload: {watchedVerusIds: data.linked_ids || {}},
    }, context.sessionScope));

    return summaries;
  });
};

const rejectSigningSecrets = value => {
  if (value == null || typeof value !== 'object') return;

  Object.keys(value).forEach(key => {
    if (/^(wif|privatekey|private_key|password|seed|seedphrase|mnemonic)$/i.test(key)) {
      throw new Error('Signing secrets cannot be saved in an identity registration.');
    }
    rejectSigningSecrets(value[key]);
  });
};

const validateJob = (job, previous, context) => {
  assertJobAccount(job, context);

  if (
    typeof job.id !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(job.id) ||
    !job.systemId ||
    !job.chainTicker ||
    !job.status
  ) {
    throw new Error('Identity registration is missing its wallet or network context.');
  }

  if (previous) {
    [
      'id',
      'accountHash',
      'systemId',
      'chainTicker',
      'rootSystemName',
      'fundingAddress',
      'keyChannel',
    ].forEach(field => {
      if (previous[field] !== job[field]) {
        throw new Error('The wallet and network for an identity registration cannot be changed.');
      }
    });

    if (
      previous.commitment?.txid &&
      (!registrationStorageEqual(previous.reservation, job.reservation) ||
        previous.saltHex !== job.saltHex)
    ) {
      const {authorizationID: previousAuthorization, ...previousReservation} = previous.reservation || {};
      const {authorizationID: nextAuthorization, ...nextReservation} = job.reservation || {};

      // A replacement may require a different namespace co-signer. Its secret
      // and name bytes remain identical, and the signed receipt stays archived.
      const replacesExpiredCommitment =
        previous.status === 'commitment_expired' &&
        job.status === 'commitment_prepared' &&
        job.commitment?.prepared &&
        !job.commitment.txid &&
        !job.commitment.signedHex &&
        previous.saltHex === job.saltHex &&
        registrationStorageEqual(previousReservation, nextReservation) &&
        registrationStorageEqual(job.previousCommitments, [
          ...(previous.previousCommitments || []),
          previous.commitment,
        ]);

      if (!replacesExpiredCommitment) {
        throw new Error('The reservation for an existing name commitment cannot be changed.');
      }
    }
  }

  rejectSigningSecrets(job);
};

const writeRegistrationJob = async (jobId, updater, requestContext, create) => {
  const context = assertRegistrationSession(requestContext);
  let savedJob;

  // Validate the revision inside the serialized write against the latest job.
  const data = await modifyServiceStoredDataForUser(current => {
    assertRegistrationSession(context);
    const {storedJobs} = readCollection(current, context);
    const previous = Object.prototype.hasOwnProperty.call(storedJobs, jobId)
      ? readStoredJob(storedJobs[jobId], jobId, context)
      : undefined;

    if (!previous && !create)
      throw new Error('Identity registration was not found in this wallet.');

    const proposed = updater(previous);
    if (proposed?.then)
      throw new Error('Identity registration updates must be synchronous.');

    if (previous && proposed.revision != null && proposed.revision !== previous.revision) {
      const error = new Error('Identity registration changed. Please review its latest state.');
      error.code = 'REGISTRATION_CHANGED';
      throw error;
    }

    validateJob(proposed, previous, context);
    if (proposed.id !== jobId) throw new Error('Identity registration ID cannot be changed.');

    savedJob = {
      ...proposed,
      version: JOB_VERSION,
      revision: (previous?.revision || 0) + 1,
      createdAt: previous?.createdAt || proposed.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    return {
      ...current,
      registration_jobs: {
        version: COLLECTION_VERSION,
        accountHash: context.sessionScope.accountHash,
        jobs: {...storedJobs, [jobId]: encodeRegistrationJob(savedJob)},
      },
    };
  }, VERUSID_SERVICE_ID, context.sessionScope.accountHash, context);

  assertRegistrationSession(context);
  publishCollection(readCollection(data, context).jobs, context);

  return savedJob;
};

export const saveRegistrationJob = (job, requestContext) =>
  writeRegistrationJob(job.id, previous => {
    if (previous && job.revision == null) {
      throw new Error('An existing identity registration requires its current revision.');
    }
    return job;
  }, requestContext, true);

export const updateRegistrationJob = (jobId, update, requestContext) =>
  writeRegistrationJob(jobId, previous =>
    typeof update === 'function' ? update(previous) : {...previous, ...update},
  requestContext, false);

// Recovery for an unreadable collection must not decode its receipts. Remove
// only registration data through the same queue used by all service writers.
export const clearRegistrationJobs = async requestContext => {
  const context = assertRegistrationSession(requestContext);

  await modifyServiceStoredDataForUser(current => {
    assertRegistrationSession(context);
    const remaining = {...current};
    delete remaining.registration_jobs;
    return remaining;
  }, VERUSID_SERVICE_ID, context.sessionScope.accountHash, context);

  assertRegistrationSession(context);
  registrationResetRevision++;

  const scopePrefix = `${context.sessionScope.accountHash}:${context.sessionScope.sessionEpoch}:`;
  for (const key of reconciliationChecks.keys()) {
    if (key.startsWith(scopePrefix)) reconciliationChecks.delete(key);
  }

  // Keep notices and list entries until their removal is safely persisted.
  return publishCollection({}, context);
};

export const removeRegistrationJob = async (jobId, expectedRevision, requestContext) => {
  const context = assertRegistrationSession(requestContext);
  const data = await modifyServiceStoredDataForUser(current => {
    assertRegistrationSession(context);
    const {storedJobs} = readCollection(current, context);
    const job = Object.prototype.hasOwnProperty.call(storedJobs, jobId)
      ? readStoredJob(storedJobs[jobId], jobId, context)
      : undefined;

    if (!job) throw new Error('Identity registration was not found in this wallet.');
    assertJobAccount(job, context);

    if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== job.revision) {
      const error = new Error('Registration changed. Review it again before deleting.');
      error.code = 'REGISTRATION_CHANGED';
      throw error;
    }

    if (!registrationDeletionKind(job)) {
      const error = new Error('A signed registration must be retained until its confirmation is verified.');
      error.code = 'REGISTRATION_NOT_DELETABLE';
      throw error;
    }

    const remaining = {...storedJobs};
    delete remaining[jobId];

    return {
      ...current,
      registration_jobs: {
        version: COLLECTION_VERSION,
        accountHash: context.sessionScope.accountHash,
        jobs: remaining,
      },
    };
  }, VERUSID_SERVICE_ID, context.sessionScope.accountHash, context);

  assertRegistrationSession(context);
  publishCollection(readCollection(data, context).jobs, context);
  reconciliationChecks.delete(`${context.sessionScope.accountHash}:${context.sessionScope.sessionEpoch}:${jobId}`);

  return {jobId};
};

const reconciliationInFlight = new Set();
const reconciliationChecks = new Map();

// Foreground wallet/service refresh owns polling. No background timer or signing
// permission survives a screen, account switch, or app termination.
export const refreshRegistrationJobs = async requestContext => {
  const context = assertRegistrationSession(requestContext);
  const scopeKey = `${context.sessionScope.accountHash}:${context.sessionScope.sessionEpoch}`;

  if (reconciliationInFlight.has(scopeKey)) return publishRegistrationJobs(context);

  reconciliationInFlight.add(scopeKey);

  try {
    const jobs = await loadCollection(context, collection => {
      publishCollection(collection.jobs, context);
      return collection.jobs;
    });

    const now = Date.now();
    const candidates = Object.values(jobs).filter(job => {
      if (!job.commitment?.txid || job.status === 'commitment_spent') return false;
      if (job.status === 'complete' && now - job.updatedAt > 24 * 60 * 60 * 1000) return false;

      const checked = reconciliationChecks.get(`${scopeKey}:${job.id}`);
      return !checked || now >= checked.nextCheck;
    }).sort((a, b) =>
      (reconciliationChecks.get(`${scopeKey}:${a.id}`)?.nextCheck || 0) -
      (reconciliationChecks.get(`${scopeKey}:${b.id}`)?.nextCheck || 0));

    // Resolve at runtime because the orchestration layer also uses job storage.
    // Keep each refresh bounded when a profile contains many pending names.
    for (const job of candidates.slice(0, 4)) {
      assertRegistrationSession(context);
      const checkKey = `${scopeKey}:${job.id}`;

      try {
        const {reconcileRegistration} = require('../../../../../utils/identityRegistration/registration');
        const review = await reconcileRegistration(job.id, {
          ...context,
          registrationBackground: true,
        });
        assertRegistrationSession(context);
        reconciliationChecks.set(checkKey, {
          nextCheck: Date.now() + (['complete', 'registered'].includes(review?.status) ? 60000 : 15000),
          failures: 0,
        });
      } catch (error) {
        assertRegistrationSession(context);
        if (error.code === 'SESSION_CHANGED') throw error;

        const failures = (reconciliationChecks.get(checkKey)?.failures || 0) + 1;
        reconciliationChecks.set(checkKey, {
          failures,
          nextCheck: Date.now() + Math.min(300000, 15000 * Math.pow(2, failures)),
        });
        // A transient lookup failure must preserve the last durable stage and
        // reservation. Never publish RPC errors, which can contain transaction data.
      }
    }

    // Confirmation updates the receipt and its notice. Linking and rebuilding
    // wallet channels require the user's separate Link to wallet action.
    return await publishRegistrationJobs(context);
  } finally {
    reconciliationInFlight.delete(scopeKey);

    // Memory here is only a polling optimization; all recovery state is encrypted.
    for (const key of reconciliationChecks.keys()) {
      if (!key.startsWith(`${scopeKey}:`)) reconciliationChecks.delete(key);
    }
  }
};
