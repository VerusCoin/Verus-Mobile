import {Buffer} from 'buffer';
import {ECPair, Transaction, networks} from '@bitgo/utxo-lib';
import {fromBase58Check, I_ADDR_VERSION, nameAndParentAddrToIAddr, resolveIdentityRegistrationName, toIAddress} from 'verus-typescript-primitives';
import store from '../../store';
import {captureSessionScope, scopeSessionAction, sessionScopeIsCurrent} from '../../actions/actions/updates/sessionRequests';
import {
  getRegistrationJobs,
  getRegistrationJob,
  saveRegistrationJob,
  updateRegistrationJob,
  publishRegistrationState,
  removeRegistrationJob,
} from '../../actions/actions/services/dispatchers/verusid/registration';
import {linkVerusId} from '../../actions/actions/services/dispatchers/verusid/verusid';
import {requestPrivKey} from '../auth/authBox';
import {randomBytes} from '../crypto/randomBytes';
import VrpcProvider from '../vrpc/vrpcInterface';
import {
  getIdentityRegistrationFunding,
  registrationRpcResult,
} from '../api/channels/verusid/requests/registerIdentity';
import {validateRegistrationQuote} from './costs';
import {registrationApprovalToken as approvalToken} from './approval';
import {registrationCommitmentFee, registrationDeletionKind} from './deletion';
import {sha256} from '../crypto/hash';
import {validateLookupBinding} from '../api/channels/verusid/requests/lookupBinding';

const inFlight = new Map();
const verifiedReceipts = new Map();
let receiptSession;
const copy = value => JSON.parse(JSON.stringify(value));
const errorWithCode = (code, message) => Object.assign(new Error(message), {code});

export const createRegistrationContext = requestContext => ({
  ...(requestContext || {}),
  sessionScope: requestContext?.sessionScope ||
    (requestContext?.sessionScoped ? requestContext : captureSessionScope(store.getState())),
});

export const assertRegistrationContext = context => {
  if (context?.signal?.aborted || !context?.sessionScope?.accountHash ||
    !sessionScopeIsCurrent(store.getState(), context.sessionScope)) {
    throw errorWithCode('SESSION_CHANGED', 'Account changed during identity registration. Open registration again in the intended account.');
  }
};

const guarded = async (context, task) => {
  assertRegistrationContext(context);
  const result = await task();
  assertRegistrationContext(context);
  return result;
};

const exclusive = async (id, context, task) => {
  assertRegistrationContext(context);
  const key = `${context.sessionScope.accountHash}:${id}`;
  const current = inFlight.get(key);
  if (current) {
    if (current.background && !context.registrationBackground) {
      await current.finished;
      return exclusive(id, context, task);
    }
    throw errorWithCode('REGISTRATION_BUSY', 'This registration is already being updated.');
  }
  let finish;
  const finished = new Promise(resolve => { finish = resolve; });
  inFlight.set(key, {background: context.registrationBackground === true, finished});
  try { return await task(); } finally { inFlight.delete(key); finish(); }
};

const readJob = async (jobId, context) => {
  const job = await guarded(context, () => getRegistrationJob(jobId, context));
  if (!job || job.accountHash !== context.sessionScope.accountHash) throw new Error('Identity registration was not found in this account.');
  return job;
};
const patchJob = (job, patch, context) => {
  assertRegistrationContext(context);
  // Polling unchanged receipts must not decrypt, re-encrypt and write the
  // entire service collection or trigger another Redux update.
  if (Object.keys(patch).every(key => JSON.stringify(job[key]) === JSON.stringify(patch[key]))) return Promise.resolve(job);
  return guarded(context, () => updateRegistrationJob(job.id, current => {
    if (current.revision !== job.revision) throw errorWithCode('REGISTRATION_CHANGED', 'Registration changed. Open it again.');
    return {...current, ...patch, updatedAt: Date.now()};
  }, context));
};

const stageFor = job => job.registration?.prepared ? 'registration' : 'commitment';

// Explicit projection: reservations, salts, raw transactions, prevouts and keys
// never enter navigation params, notifications, Redux, or the rendered review.
export const registrationReview = job => {
  const stage = stageFor(job);
  return {
    jobId: job.id,
    approvalToken: approvalToken(job),
    status: job.status,
    deletionKind: registrationDeletionKind(job),
    linked: job.linked,
    stage,
    systemId: job.systemId,
    chainTicker: job.chainTicker,
    rootSystemName: job.rootSystemName,
    fundingAddress: job.fundingAddress,
    fundingName: job.fundingName || null,
    signingAddress: job.signingAddress,
    referralID: job.request.referralID || null,
    registrationAuthority: job.reservation.authorizationID || null,
    currencyNames: copy(job.currencyNames || {}),
    identityNames: copy(job.identityNames || {}),
    displayName: job.displayName,
    identityAddress: job.identityAddress,
    identity: copy(job.identity),
    quote: copy(job[stage].prepared.quote),
    commitmentTxid: job.commitment.txid,
    commitmentFee: registrationCommitmentFee(job),
    registrationTxid: job.registration?.txid,
    commitmentHeight: job.commitment.height,
    lastError: job.lastError || null,
    createdAt: job.createdAt,
  };
};

const sdkRequest = request => ({
  name: request.name,
  parent: request.parent || undefined,
  parentName: request.parentName || undefined,
  systemID: request.systemId,
  rootSystemName: request.rootSystemName,
  referralID: request.referralID || undefined,
});

const assertWalletRequest = request => {
  if (!request?.systemId || !request.chainTicker || !request.rootSystemName || !request.fundingAddress || !request.signingAddress || !request.name) {
    throw new Error('Select a network, payment source, signing address, and identity name.');
  }
  if (request.keyChannel && request.keyChannel !== 'vrpc') {
    throw new Error('Identity registration currently requires a Verus RPC transparent wallet.');
  }
};

const isIdentityAddress = value => {
  try { return fromBase58Check(value).version === I_ADDR_VERSION; } catch (_) { return false; }
};

const responseIdentityName = (request, address, result) => {
  validateLookupBinding(request.systemId, address, result?.identity?.identityaddress,
    result?.fullyqualifiedname, 'identity');
  return result.fullyqualifiedname;
};

// Names are only presentation data. They never replace addresses in quotes,
// authority checks, transaction construction or the payment approval token.
const resolveIdentityNames = async ({request, policy, quote, identity, identityAddress, displayName, reservation,
  currencyNames = {}, identityNames = {}, responses = {}}, context) => {
  assertRegistrationContext(context);
  const resolvedName = policy?.resolvedName;
  const ownAddress = identityAddress || resolvedName?.identityID;
  const addresses = [...new Set([
    ownAddress, request.systemId, request.parent, request.fundingAddress,
    request.referralID, request.recoveryAuthority, request.revocationAuthority,
    identity?.parent, identity?.recoveryauthority, identity?.revocationauthority,
    ...(identity?.primaryaddresses || []), policy?.requiredAuthorityID, reservation?.authorizationID,
    quote?.parentID, quote?.issuerID, quote?.issuerPayment?.recipient,
    ...(quote?.referralPayments || []).map(payment => payment.recipient),
  ].filter(Boolean))];
  const linked = store.getState().channelStore_verusid?.watchedVerusIds || {};
  const known = {
    ...(linked[request.rootSystemName] || {}), ...(linked[request.chainTicker] || {}),
    ...currencyNames, ...identityNames,
  };
  for (const definition of [policy?.nativeDefinition, policy?.parentDefinition]) {
    if (definition?.currencyid && !known[definition.currencyid]) known[definition.currencyid] = definition.fullyqualifiedname || definition.name;
  }
  if (request.fundingName && request.fundingAddress !== request.signingAddress) {
    known[request.fundingAddress] = request.fundingName;
  }
  if (ownAddress) known[ownAddress] = displayName || resolvedName?.fullName;
  const names = {};
  const missing = [];
  for (const address of addresses) {
    if (typeof known[address] === 'string' && known[address].trim()) names[address] = known[address];
    else if (responses[address]) {
      try { names[address] = responseIdentityName(request, address, responses[address]); } catch (_) { /* Display lookup is optional. */ }
    }
    if (!names[address] && isIdentityAddress(address)) missing.push(address);
  }
  // Only look up addresses already part of this registration, on its selected
  // chain. Bound concurrency keeps referral lists from flooding the endpoint.
  const client = VrpcProvider.getVerusIdInterface(request.systemId);
  for (let offset = 0; offset < missing.length; offset += 3) {
    await Promise.all(missing.slice(offset, offset + 3).map(async address => {
      try {
        const result = registrationRpcResult(await guarded(context,
          () => client.interface.getIdentity(address)), 'Get identity name');
        names[address] = responseIdentityName(request, address, result);
      } catch (_) {
        // A missing label must not prevent a payment, but a stale account must
        // never publish labels from a lookup started in the previous account.
        assertRegistrationContext(context);
      }
    }));
  }
  assertRegistrationContext(context);
  return names;
};

const normalizeIdentityChoices = async (request, context) => {
  for (const field of ['referralID', 'recoveryAuthority', 'revocationAuthority']) {
    const value = request[field]?.trim();
    if (!value) {
      delete request[field];
      continue;
    }
    request[field] = value;
    if (isIdentityAddress(value)) continue;
    const expectedAddress = toIAddress(value, request.rootSystemName);
    const client = VrpcProvider.getVerusIdInterface(request.systemId);
    const result = registrationRpcResult(await guarded(context,
      () => client.interface.getIdentity(value)), 'Find identity');
    responseIdentityName(request, expectedAddress, result);
    request[field] = expectedAddress;
  }
  return request;
};

// A bare leaf belongs to the selected chain's native namespace. Fully
// qualified input and explicit namespace selections retain their own parent.
// The SDK remains responsible for deriving/binding the returned namespace name.
export const normalizeRegistrationRequest = async (request, requestContext) => {
  const context = createRegistrationContext(requestContext);
  request = copy(request);
  assertWalletRequest(request);
  request = await normalizeIdentityChoices(request, context);
  if (request.parent || request.parentName || request.name.includes('.') ||
    request.systemId === toIAddress(`${request.rootSystemName}.`, '')) return request;
  const client = VrpcProvider.getVerusIdInterface(request.systemId);
  const currency = registrationRpcResult(await guarded(context, () => client.interface.getCurrency(request.systemId)), 'Get registration namespace');
  if (currency?.currencyid !== request.systemId || currency.systemid !== request.systemId) {
    throw errorWithCode('WRONG_REGISTRATION_SYSTEM', 'The native namespace does not match the selected registration network.');
  }
  if (typeof currency.fullyqualifiedname !== 'string' || !currency.fullyqualifiedname) {
    throw new Error('The RPC endpoint did not provide the native namespace name. Enter a fully qualified identity name.');
  }
  return {...request, parent: request.systemId, parentName: currency.fullyqualifiedname};
};

const controlsAuthority = (authority, signingAddress) =>
  authority && (authority.minimumSignatures ?? authority.minimumsignatures) === 1 &&
  (authority.primaryAddresses || authority.primaryaddresses || []).includes(signingAddress) &&
  authority.revoked !== true && !((authority.flags || 0) & 0x8000);

const assertPolicyCanBeSigned = (policy, signingAddress) => {
  if (policy.requiredAuthorityID && !controlsAuthority(policy.requiredAuthority, signingAddress)) {
    throw errorWithCode('EXTERNAL_AUTHORIZATION_REQUIRED',
      'This namespace requires an issuer or referral signature that this wallet cannot provide. Choose a namespace this wallet can authorize before paying a commitment fee.');
  }
};

const assertPreparedCanBeSigned = (prepared, signingAddress) => {
  if ((prepared.revealAuthorities || []).some(authority => !controlsAuthority(authority, signingAddress))) {
    throw errorWithCode('EXTERNAL_AUTHORIZATION_REQUIRED', prepared.stage === 'commitment' ? 'This wallet cannot provide all signatures needed to finish registration. No commitment has been sent.' : 'Additional authorization is required to finish registration. Your existing name commitment is retained.');
  }
  for (const input of prepared.requiredSignatures) {
    const fulfilled = input.requirements.filter(requirement =>
      requirement.threshold === 1 && requirement.eligibleKeyIDs.includes(signingAddress));
    if (fulfilled.length < input.threshold) {
      throw errorWithCode('EXTERNAL_AUTHORIZATION_REQUIRED', 'Registration requires signing keys that are not in the selected wallet.');
    }
  }
};

const makeIdentity = (request, resolvedName) => ({
  version: 3,
  flags: 0,
  minimumsignatures: 1,
  timelock: 0,
  name: resolvedName.name,
  parent: resolvedName.parent,
  systemid: request.systemId,
  identityaddress: resolvedName.identityID,
  primaryaddresses: [request.signingAddress],
  recoveryauthority: request.recoveryAuthority || resolvedName.identityID,
  revocationauthority: request.revocationAuthority || resolvedName.identityID,
});

export const resolveRegistration = async (request, requestContext) => {
  const context = createRegistrationContext(requestContext);
  request = await normalizeRegistrationRequest(request, context);
  const client = VrpcProvider.getVerusIdInterface(request.systemId);
  const result = await guarded(context, () => client.resolveIdentityRegistration(sdkRequest(request)));
  validateRegistrationQuote(result.quote);
  const signingAddress = request.signingAddress;
  assertPolicyCanBeSigned(result.policy, signingAddress);
  const identityResponses = {};
  if (request.fundingAddress !== signingAddress) {
    const response = registrationRpcResult(await guarded(context, () => client.interface.getIdentity(request.fundingAddress)), 'Get payment identity');
    identityResponses[request.fundingAddress] = response;
    const identity = response?.identity;
    if (identity?.identityaddress !== request.fundingAddress || !controlsAuthority(identity, signingAddress)) {
      throw errorWithCode('FUNDING_AUTHORIZATION_REQUIRED',
        'The selected payment identity must be unrevoked and spendable with this wallet key alone. Choose another payment source.');
    }
    // This is an early ownership check. The SDK also verifies the current
    // defining transaction, locks and each funding output before signing.
  }
  // Fail invalid external recovery/revocation choices before the first charge.
  for (const id of new Set([request.recoveryAuthority, request.revocationAuthority].filter(Boolean))) {
    if (id === result.policy.resolvedName.identityID) continue;
    const response = registrationRpcResult(await guarded(context, () => client.interface.getIdentity(id)), 'Get identity authority');
    identityResponses[id] = response;
    const identity = response?.identity;
    if (identity?.identityaddress !== id || (identity.flags & 0x8000)) {
      throw new Error('Recovery and revocation authorities must be existing, unrevoked identity i-addresses.');
    }
  }
  const currencyNames = [result.policy.nativeDefinition, result.policy.parentDefinition].filter(Boolean).reduce((names, definition) => {
    names[definition.currencyid] = definition.fullyqualifiedname || definition.name;
    return names;
  }, {});
  const identityNames = await resolveIdentityNames({request, ...result, currencyNames, responses: identityResponses}, context);
  return {...result, request, currencyNames, identityNames};
};

// Raw bytes are immutable under their txid. Reuse saved source transactions,
// while the SDK still verifies their hashes and freshly queries every gettxout.
const withSavedFundingTransactions = (funding, prevouts = []) => {
  const transactions = new Map(prevouts.filter(input => typeof input.rawTransaction === 'string')
    .map(input => [input.txid, input.rawTransaction]));
  return funding.map(input => transactions.has(input.txid)
    ? {...input, rawTransaction: transactions.get(input.txid)} : input);
};

const buildCommitment = async (request, saltHex, approvedCosts, context, replacementPrevouts, savedPrevouts) => {
  const client = VrpcProvider.getVerusIdInterface(request.systemId);
  let funding = await guarded(context, () => getIdentityRegistrationFunding(request.systemId, request.fundingAddress));
  if (replacementPrevouts) {
    // Sharing an original input makes the old and replacement commitments
    // mutually exclusive even if a deep reorg moves below the old expiry.
    const shared = funding.find(input => replacementPrevouts.some(old => old.txid === input.txid && old.vout === input.vout));
    if (!shared) throw new Error('The expired commitment funding was spent. Its recovery record is retained; a safe replacement cannot be built.');
    funding = [shared, ...funding.filter(input => input !== shared)];
  }
  funding = withSavedFundingTransactions(funding, savedPrevouts);
  let built;
  try {
    built = await guarded(context, () => client.createNameReservationTransaction({
      ...sdkRequest(request),
      controller: request.signingAddress,
      salt: Buffer.from(saltHex, 'hex'),
      funding,
      changeAddress: request.fundingAddress,
      approvedCosts: copy(approvedCosts),
    }));
  } catch (error) {
    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw errorWithCode('INSUFFICIENT_FUNDS',
        `The selected payment source (${request.fundingName || request.fundingAddress}) does not have enough spendable funds for both steps. Review the total cost and choose a funded payment source.`);
    }
    throw error;
  }
  validateRegistrationQuote(built.transaction.quote);
  assertPreparedCanBeSigned(built.transaction, request.signingAddress);
  return built;
};

// Resume by canonical identity before an availability check can reject a name
// that this wallet has already registered. No RPC or funding check is needed.
export const findExistingRegistration = async (request, requestContext) => {
  const context = createRegistrationContext(requestContext);
  const jobs = Object.values(await guarded(context, () => getRegistrationJobs(context)))
    .filter(job => job.systemId === request.systemId);
  if (!jobs.length) return null;
  const resolvedName = resolveIdentityRegistrationName(sdkRequest(request));
  const nativeLeaf = !request.parent && !request.parentName && !request.name.includes('.');
  const identityAddress = nativeLeaf
    ? nameAndParentAddrToIAddr(resolvedName.name, request.systemId)
    : resolvedName.identityID;
  const existing = jobs.find(job => job.identityAddress === identityAddress);
  return existing ? registrationReview(existing) : null;
};

export const prepareCommitment = async ({request, approvedCosts}, requestContext) => {
  const context = createRegistrationContext(requestContext);
  const existingReview = await findExistingRegistration(request, context);
  if (existingReview) return existingReview;
  const resolved = await resolveRegistration(request, context);
  request = resolved.request;
  approvedCosts = copy(approvedCosts || resolved.quote.totalOperationRequired);
  const identityAddress = resolved.policy.resolvedName.identityID;
  return exclusive(`name:${request.systemId}:${identityAddress}`, context, async () => {
    const jobs = await guarded(context, () => getRegistrationJobs(context));
    const existing = Object.values(jobs).find(job => job.systemId === request.systemId && job.identityAddress === identityAddress);
    if (existing) return registrationReview(existing);
    const salt = await guarded(context, () => randomBytes(32));
    if (!Buffer.isBuffer(salt) || salt.length !== 32 || salt.equals(Buffer.alloc(32))) throw new Error('Secure random generator returned an invalid reservation salt. Try again.');
    let built;
    try {
      built = await buildCommitment(request, salt.toString('hex'), approvedCosts, context);
    } catch (error) {
      if (error.code !== 'SESSION_CHANGED') error.registrationEstimate = {
        quote: copy(resolved.quote), currencyNames: copy(resolved.currencyNames), identityNames: copy(resolved.identityNames),
      };
      throw error;
    }
    const id = (await guarded(context, () => randomBytes(16))).toString('hex');
    const job = {
      id,
      schemaVersion: 1,
      accountHash: context.sessionScope.accountHash,
      systemId: request.systemId,
      chainTicker: request.chainTicker,
      rootSystemName: request.rootSystemName,
      fundingAddress: request.fundingAddress,
      fundingName: request.fundingName || null,
      signingAddress: request.signingAddress,
      keyChannel: request.keyChannel || 'vrpc',
      status: 'commitment_prepared',
      linked: false,
      name: resolved.policy.resolvedName.name,
      displayName: built.reservation.fullName,
      identityAddress,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      request,
      currencyNames: resolved.currencyNames,
      identityNames: resolved.identityNames,
      identity: makeIdentity(request, resolved.policy.resolvedName),
      reservation: built.reservation,
      saltHex: salt.toString('hex'),
      commitment: {prepared: built.transaction, vout: built.commitmentVout},
    };
    const saved = await guarded(context, () => saveRegistrationJob(job, context));
    return registrationReview(saved);
  });
};

export const getRegistrationReview = async (jobId, requestContext) => {
  const context = createRegistrationContext(requestContext);
  const job = await readJob(jobId, context);
  // Retry unresolved display names without rebuilding or paying either stage.
  const identityNames = await resolveIdentityNames({...job,
    quote: job[stageFor(job)].prepared.quote}, context);
  return registrationReview({...job, identityNames});
};

const buildRegistration = async (job, identity, approvedCosts, context) => {
  const funding = await guarded(context, () => getIdentityRegistrationFunding(job.systemId, job.fundingAddress));
  const client = VrpcProvider.getVerusIdInterface(job.systemId);
  const prepared = await guarded(context, () => client.createIdentityRegistrationTransaction({
    reservation: copy(job.reservation),
    commitment: {txid: job.commitment.txid, vout: job.commitment.vout, rawTransaction: job.commitment.signedHex},
    identity: copy(identity),
    funding: withSavedFundingTransactions(
      funding.filter(input => input.txid !== job.commitment.txid || input.vout !== job.commitment.vout),
      [...job.commitment.prepared.prevouts, ...(job.registration?.prepared.prevouts || []),
        {txid: job.commitment.txid, rawTransaction: job.commitment.signedHex}],
    ),
    changeAddress: job.fundingAddress,
    approvedCosts: copy(approvedCosts),
  }));
  validateRegistrationQuote(prepared.quote);
  assertPreparedCanBeSigned(prepared, job.signingAddress);
  return prepared;
};

// Authorization may change with namespace policy, but the original secret,
// name, controller and reservation preimage must survive every rebuild.
const assertSameReservation = (saved, rebuilt) => {
  const fields = new Set([...Object.keys(saved), ...Object.keys(rebuilt)]);
  if ([...fields].some(field => field !== 'authorizationID' && saved[field] !== rebuilt[field])) {
    throw new Error('Saved name reservation changed.');
  }
};

const refreshUnsigned = async (job, context, persist = true) => {
  const stage = stageFor(job);
  if (job[stage].signedHex) return job;
  const resolved = await resolveRegistration(job.request, context);
  let patch;
  if (stage === 'commitment') {
    // Reuse the original salt and its exact reservation bytes on every review.
    const built = await buildCommitment(job.request, job.saltHex, resolved.quote.totalOperationRequired, context, job.replacementFunding, job.commitment.prepared.prevouts);
    assertSameReservation(job.reservation, built.reservation);
    patch = {
      reservation: built.reservation,
      commitment: {...job.commitment, prepared: built.transaction, vout: built.commitmentVout},
      status: 'commitment_prepared', lastError: null,
    };
  } else {
    const prepared = await buildRegistration(job, job.identity, resolved.quote.totalRequired, context);
    patch = {registration: {prepared}, status: 'registration_prepared', lastError: null};
  }
  const identityNames = await resolveIdentityNames({...job, ...resolved, ...patch,
    quote: patch[stage].prepared.quote}, context);
  patch = {...patch, currencyNames: resolved.currencyNames, identityNames};
  return persist ? patchJob(job, patch, context) : {...job, ...patch};
};

export const refreshRegistrationReview = async (jobId, requestContext) => {
  const context = createRegistrationContext(requestContext);
  return exclusive(jobId, context, async () => {
    let job = await readJob(jobId, context);
    if (job.status === 'commitment_expired') {
      job = await reconcileJob(job, context);
      if (job.status !== 'commitment_expired') return registrationReview(job);
      const resolved = await resolveRegistration(job.request, context);
      const built = await buildCommitment(job.request, job.saltHex, resolved.quote.totalOperationRequired, context, job.commitment.prepared.prevouts, job.commitment.prepared.prevouts);
      assertSameReservation(job.reservation, built.reservation);
      job = await patchJob(job, {
        reservation: built.reservation,
        previousCommitments: [...(job.previousCommitments || []), job.commitment],
        replacementFunding: job.commitment.prepared.prevouts.map(({txid, vout}) => ({txid, vout})),
        previousRegistrations: [...(job.previousRegistrations || []), ...(job.registration ? [job.registration] : [])],
        commitment: {prepared: built.transaction, vout: built.commitmentVout},
        registration: undefined,
        currencyNames: resolved.currencyNames,
        identityNames: resolved.identityNames,
        status: 'commitment_prepared',
        lastError: null,
      }, context);
      return registrationReview(job);
    }
    return registrationReview(await refreshUnsigned(job, context));
  });
};

export const prepareRegistration = async ({jobId, identity}, requestContext) => {
  const context = createRegistrationContext(requestContext);
  identity = identity == null ? undefined : copy(identity);
  return exclusive(jobId, context, async () => {
    let job = await readJob(jobId, context);
    // Opening an existing unsigned review is read-only. Payment approval still
    // rebuilds and verifies its current policy, funding and commitment evidence.
    if (job.status === 'registration_prepared' && !identity) return registrationReview(job);
    job = await reconcileJob(job, context);
    if (job.registration?.signedHex && job.status !== 'registration_expired') return registrationReview(job);
    if (!['commitment_confirmed', 'registration_prepared', 'registration_expired'].includes(job.status)) {
      throw new Error('Wait for your name commitment to confirm before continuing registration.');
    }
    const resolved = await resolveRegistration(job.request, context);
    const definition = identity || job.identity;
    const prepared = await buildRegistration(job, definition, resolved.quote.totalRequired, context);
    job = await patchJob(job, {
      identity: definition,
      currencyNames: resolved.currencyNames,
      identityNames: resolved.identityNames,
      previousRegistrations: [...(job.previousRegistrations || []), ...(job.registration?.signedHex ? [job.registration] : [])],
      registration: {prepared},
      status: 'registration_prepared',
      lastError: null,
    }, context);
    return registrationReview(job);
  });
};

const signAndSend = async (jobId, stage, expectedApprovalToken, context) => exclusive(jobId, context, async () => {
  let job = await readJob(jobId, context);
  if (job[stage]?.signedHex) return registrationReview(await sendSaved(job, stage, context));
  if (job.status !== `${stage}_prepared`) throw new Error('Review this registration stage before approving it.');
  if (!expectedApprovalToken || expectedApprovalToken !== approvalToken(job)) throw errorWithCode('REVIEW_CHANGED', 'This registration changed after it was displayed. Review it again before approving.');
  const privateKey = await guarded(context, () => requestPrivKey(job.chainTicker, job.keyChannel, context));
  const signingAddress = job.signingAddress;
  if (ECPair.fromWIF(privateKey, networks.verus).getAddress() !== signingAddress) {
    throw new Error('Selected control address does not belong to this wallet key.');
  }
  const saved = job;
  job = await refreshUnsigned(job, context, false);
  // Refresh may select new inputs or encounter changed policy at the same
  // price. Bind the rebuilt transaction to the review before signing.
  if (expectedApprovalToken !== approvalToken(job)) {
    await patchJob(saved, job, context);
    throw errorWithCode('REVIEW_CHANGED', 'Registration details changed. Review the updated costs, payment source, and authorization before approving again.');
  }
  const transaction = job[stage].prepared;
  const client = VrpcProvider.getVerusIdInterface(job.systemId);
  client.verifyIdentityRegistrationFunding(transaction, transaction.txHex, job.fundingAddress);
  const keys = transaction.requiredSignatures.map(input => input.requirements.some(
    requirement => requirement.eligibleKeyIDs.includes(signingAddress)) ? [privateKey] : []);
  assertRegistrationContext(context);
  const signed = client.signIdentityRegistrationTransaction({transaction, keys});
  if (signed.signingStatus !== 'complete') throw new Error('Registration requires more signatures. No transaction was sent.');
  const receipt = {...job[stage], signedHex: signed.hex, txid: signed.txid};
  verifyReceipt(job, receipt, context);
  // The exact signed bytes and txid are durable before the first network send.
  job = await patchJob(saved, {
    ...job,
    [stage]: receipt,
    status: `${stage}_signed`,
    lastError: null,
  }, context);
  // This is the first send of freshly validated, durably saved bytes. Recovery
  // retries use sendSaved, which separately proves their current chain status.
  return registrationReview(await broadcastSaved(job, stage, context));
});

export const approveCommitment = (jobId, expectedApprovalToken, requestContext) => signAndSend(jobId, 'commitment', expectedApprovalToken, createRegistrationContext(requestContext));
export const approveRegistration = (jobId, expectedApprovalToken, requestContext) => signAndSend(jobId, 'registration', expectedApprovalToken, createRegistrationContext(requestContext));

// Receipt validation is pure for this exact plan, bytes, and approved change
// address. Cache only its digest. Chain confirmation and spend checks stay live.
const verifyReceipt = (job, receipt, context) => {
  assertRegistrationContext(context);
  const session = `${context.sessionScope.accountHash}:${context.sessionScope.sessionEpoch}`;
  if (receiptSession !== session) { verifiedReceipts.clear(); receiptSession = session; }
  const digest = sha256(Buffer.from(JSON.stringify({systemId: job.systemId, fundingAddress: job.fundingAddress,
    prepared: receipt.prepared, signedHex: receipt.signedHex, txid: receipt.txid}))).toString('hex');
  if (verifiedReceipts.has(digest)) return;
  const client = VrpcProvider.getVerusIdInterface(job.systemId);
  const checked = client.validateIdentityRegistrationTransaction(receipt.prepared, receipt.signedHex, job.fundingAddress);
  if (checked.signingStatus !== 'complete' || checked.txid !== receipt.txid) throw new Error('Saved registration signature verification failed.');
  verifiedReceipts.set(digest, true);
  if (verifiedReceipts.size > 32) verifiedReceipts.delete(verifiedReceipts.keys().next().value);
};

const transactionEvidence = async (job, stage, context) => {
  const transaction = job[stage];
  if (!transaction?.signedHex) return null;
  const rpc = VrpcProvider.getVerusIdInterface(job.systemId).interface;
  const response = await guarded(context, () => rpc.getRawTransaction(transaction.txid, 1));
  // Only the daemon's explicit absence code permits an identical-byte retry.
  // Authentication/transport/index failures are never evidence of absence.
  if (response?.error?.code === -5) return {found: false};
  const result = registrationRpcResult(response, 'Find registration transaction');
  if (!result || result.txid !== transaction.txid || result.hex !== transaction.signedHex ||
    Transaction.fromHex(result.hex, networks.verus).getId() !== transaction.txid) {
    throw new Error('RPC transaction does not match the saved signed transaction.');
  }
  if (!Number.isSafeInteger(result.confirmations) || result.confirmations < 1 || !result.blockhash) {
    return {found: true, confirmed: false};
  }
  const block = registrationRpcResult(await guarded(context, () => rpc.getBlock(result.blockhash, 1)), 'Check registration block');
  if (block.hash !== result.blockhash || !Number.isSafeInteger(block.height) || block.height < 1 ||
    !Number.isSafeInteger(block.confirmations) || block.confirmations < 1) {
    return {found: true, confirmed: false};
  }
  const activeBlock = registrationRpcResult(await guarded(context, () => rpc.getBlock(String(block.height), 1)), 'Check active registration block');
  const includesTransaction = Array.isArray(block.tx) && block.tx.some(tx => (typeof tx === 'string' ? tx : tx?.txid) === transaction.txid);
  if (!includesTransaction || activeBlock.hash !== block.hash || activeBlock.height !== block.height ||
    !Number.isSafeInteger(activeBlock.confirmations) || activeBlock.confirmations < 1) {
    return {found: true, confirmed: false};
  }
  return {found: true, confirmed: true, height: block.height, blockHash: block.hash};
};

const currentTip = async (job, context) => {
  const rpc = VrpcProvider.getVerusIdInterface(job.systemId).interface;
  const info = registrationRpcResult(await guarded(context, () => rpc.getInfo()), 'Check chain height');
  if (!Number.isSafeInteger(info.blocks) || info.blocks < 1 || info.longestchain > info.blocks) {
    throw new Error('Registration requires a synchronized RPC endpoint.');
  }
  const tip = registrationRpcResult(await guarded(context, () => rpc.getBlock(String(info.blocks), 1)), 'Check active chain tip');
  if (tip.height !== info.blocks || tip.confirmations !== 1 || !/^[0-9a-f]{64}$/i.test(tip.hash)) throw new Error('Could not verify the active chain tip.');
  return tip;
};

const reconcileJob = async (job, context) => {
  if (!job.commitment.signedHex) return job;
  const client = VrpcProvider.getVerusIdInterface(job.systemId);
  // Reading a signed receipt never trusts storage or an RPC to replace its intent.
  for (const stage of ['commitment', 'registration']) {
    if (job[stage]?.signedHex) verifyReceipt(job, job[stage], context);
  }
  const registration = await transactionEvidence(job, 'registration', context);
  if (registration?.confirmed) {
    // The confirmed bytes equal the independently approved, validated reveal.
    // A later identity update does not invalidate this registration receipt.
    const linked = job.linked;
    const status = linked ? 'complete' : 'registered';
    if (job.status !== status || job.registration.height !== registration.height ||
      job.registration.blockHash !== registration.blockHash) {
      job = await patchJob(job, {
        status, linked, lastError: null,
        registration: {...job.registration, height: registration.height, blockHash: registration.blockHash},
      }, context);
    }
    return job;
  }
  const tip = await currentTip(job, context);
  if (registration?.found && job.registration.prepared.snapshot.expiryHeight > tip.height) {
    return job.status === 'registration_broadcast' ? job : patchJob(job, {status: 'registration_broadcast', lastError: null}, context);
  }
  const commitment = await transactionEvidence(job, 'commitment', context);
  if (job.registration?.signedHex && job.registration.prepared.snapshot.expiryHeight <= tip.height) {
    job = await patchJob(job, {status: 'registration_expired', lastError: 'The registration transaction expired before confirmation. Review a new transaction using the same commitment.'}, context);
  }
  if (commitment?.confirmed) {
    const unspent = registrationRpcResult(await guarded(context, () => client.interface.getTxOut(job.commitment.txid, job.commitment.vout, true)), 'Check name commitment');
    if (unspent == null) {
      // A submitted reveal may spend it while an RPC index catches up. Retain
      // both receipts; never create another commitment or discard the secret.
      const status = job.registration?.signedHex
        ? (['registered', 'complete'].includes(job.status) ? 'registration_signed' : job.status)
        : 'commitment_spent';
      return patchJob(job, {status, lastError: 'The commitment is spent. Check the saved registration transaction before proceeding.'}, context);
    }
    if (unspent.bestblock !== tip.hash || !Number.isSafeInteger(unspent.confirmations) || unspent.confirmations < 1 ||
      tip.height - unspent.confirmations + 1 !== commitment.height ||
      unspent.scriptPubKey?.hex !== job.commitment.prepared.outputPlan[job.commitment.vout].scriptHex) {
      throw new Error('Name commitment is not confirmed on the current active chain.');
    }
    const status = job.registration?.signedHex
      ? (job.status === 'registration_expired' ? 'registration_expired' : 'registration_signed')
      : (job.registration?.prepared ? 'registration_prepared' : 'commitment_confirmed');
    return patchJob(job, {status, commitment: {...job.commitment, height: commitment.height, blockHash: commitment.blockHash}, lastError: status === 'registration_expired' ? job.lastError : null}, context);
  }
  const expired = job.commitment.prepared.snapshot.expiryHeight <= tip.height;
  return patchJob(job, {
    status: expired ? 'commitment_expired' : (commitment?.found ? 'commitment_broadcast' : 'commitment_signed'),
    commitment: {...job.commitment, height: undefined, blockHash: undefined},
    lastError: expired ? 'The commitment transaction expired before confirmation. Its saved recovery data has been retained.' : null,
  }, context);
};

export const reconcileRegistration = async (jobId, requestContext) => {
  const context = createRegistrationContext(requestContext);
  return exclusive(jobId, context, async () => registrationReview(await reconcileJob(await readJob(jobId, context), context)));
};

export const deleteRegistration = async (jobId, expectedDeletionKind, requestContext) => {
  const context = createRegistrationContext(requestContext);
  return exclusive(jobId, context, async () => {
    let job = await readJob(jobId, context);
    if (!expectedDeletionKind || registrationDeletionKind(job) !== expectedDeletionKind) {
      throw errorWithCode('REGISTRATION_CHANGED', 'Registration changed. Review its current status before deleting it.');
    }
    if (expectedDeletionKind === 'completed') {
      job = await reconcileJob(job, context);
      if (registrationDeletionKind(job) !== 'completed') throw new Error('Registration is still in progress. Its payment record cannot be deleted yet.');
    }
    return guarded(context, () => removeRegistrationJob(jobId, job.revision, context));
  });
};

export const linkRegisteredIdentity = async (jobId, requestContext) => {
  const context = createRegistrationContext(requestContext);
  return exclusive(jobId, context, async () => {
    let job = await readJob(jobId, context);
    if (!job.commitment?.signedHex || !job.registration?.signedHex) {
      throw new Error('Wait for the registration to confirm before linking this identity.');
    }
    job = await reconcileJob(job, context);
    if (!['registered', 'complete'].includes(job.status)) {
      throw new Error('Wait for the registration to confirm before linking this identity.');
    }
    // A saved status is never proof of confirmation, including after a reorg
    // or when a daemon temporarily cannot find the transaction spending it.
    const confirmation = await transactionEvidence(job, 'registration', context);
    if (!confirmation?.confirmed) {
      throw new Error('Wait for the registration to confirm before linking this identity.');
    }
    if (job.status === 'complete') return registrationReview(job);

    // Rebuild wallet channels as in the existing Link VerusID flow. Publish the
    // new link directly so this action does not re-enter registration polling.
    // Load lifecycle code only for this explicit action, never in reconciliation.
    const {setUserCoins} = require('../../actions/actionCreators');
    const {clearChainLifecycle, refreshActiveChainLifecycles} = require('../../actions/actions/intervals/dispatchers/lifecycleManager');
    await guarded(context, () => linkVerusId(job.identityAddress, job.displayName, job.chainTicker, context));
    await guarded(context, () => publishRegistrationState(context));
    const state = store.getState();
    assertRegistrationContext(context);
    clearChainLifecycle(job.chainTicker, undefined, context.sessionScope);
    const action = setUserCoins(state.coins.activeCoinList, state.authentication.activeAccount.id);
    store.dispatch(scopeSessionAction(action, context.sessionScope));
    assertRegistrationContext(context);
    refreshActiveChainLifecycles(action.payload.activeCoinsForUser);
    assertRegistrationContext(context);
    // Leave the action retryable if storage or wallet refresh failed after the
    // idempotent link write. No retry signs or sends another transaction.
    job = await patchJob(job, {status: 'complete', linked: true, lastError: null}, context);
    return registrationReview(job);
  });
};

const sendSaved = async (originalJob, stage, context) => {
  let job = await reconcileJob(originalJob, context);
  if (['complete', 'registered', 'registration_broadcast'].includes(job.status) ||
    (stage === 'commitment' && ['commitment_confirmed', 'commitment_broadcast', 'registration_prepared'].includes(job.status))) return job;
  if (job.status !== `${stage}_signed`) throw new Error('This saved transaction cannot be resent in its current state. Review its registration status.');
  verifyReceipt(job, job[stage], context);
  return broadcastSaved(job, stage, context);
};

const broadcastSaved = async (job, stage, context) => {
  const transaction = job[stage];
  const client = VrpcProvider.getVerusIdInterface(job.systemId);
  // A local rejection must escape the uncertain-broadcast recovery path below.
  // Recheck even when signature validation has a cached result for these bytes.
  assertRegistrationContext(context);
  client.verifyIdentityRegistrationFunding(transaction.prepared, transaction.signedHex, job.fundingAddress);
  try {
    const response = await guarded(context, () => client.sendIdentityRegistrationTransaction(transaction.prepared, transaction.signedHex, job.fundingAddress));
    const txid = registrationRpcResult(response, 'Send registration transaction');
    if (txid !== transaction.txid) throw new Error('Broadcast returned a different transaction ID.');
    return patchJob(job, {status: `${stage}_broadcast`, lastError: null}, context);
  } catch (error) {
    // An accepted send can time out. Keep precisely the same bytes for all
    // retries; never regenerate the salt or sign a replacement on this path.
    assertRegistrationContext(context);
    job = await patchJob(job, {lastError: 'Broadcast could not be confirmed. Check status, then retry the same saved transaction if needed.'}, context);
    try { return await reconcileJob(job, context); } catch (reconcileError) {
      if (reconcileError.code === 'SESSION_CHANGED') throw reconcileError;
      return job;
    }
  }
};

export const retryBroadcast = async (jobId, requestContext) => {
  const context = createRegistrationContext(requestContext);
  return exclusive(jobId, context, async () => {
    const job = await readJob(jobId, context);
    return registrationReview(await sendSaved(job, stageFor(job), context));
  });
};
