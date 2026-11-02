const {makeRegistrationJob: makeJob} = require('../../../../debug/fixtures/identityRegistration');
const {encodeRegistrationJob, decodeRegistrationJob} = require('../../identityRegistration/storage');
const {registrationDeletionKind, registrationCommitmentFee} = require('../../identityRegistration/deletion');

const copy = value => JSON.parse(JSON.stringify(value));
const context = job => ({id: job.id, accountHash: job.accountHash});
const roundTrip = job => decodeRegistrationJob(copy(encodeRegistrationJob(job)), context(job));

test('roundtrips a reservation without reversing its salt or changing its full name', () => {
  const job = makeJob();
  const before = copy(job);
  const encoded = encodeRegistrationJob(job);
  expect(encoded.format).toBe(2);
  expect(encoded.values.id).toBeUndefined();
  expect(encoded.values.accountHash).toBeUndefined();
  expect(encoded.values.saltHex).toBeUndefined();
  expect(encoded.reservation.values).toEqual({});
  expect(roundTrip(job)).toEqual(job);
  expect(job).toEqual(before);
});

test('preserves custom identity content, request spelling, authorities and shared labels', () => {
  const job = makeJob();
  Object.assign(job.identity, {
    flags: 8, minimumsignatures: 2, primaryaddresses: ['R-a', 'R-b'],
    recoveryauthority: 'i-recovery', revocationauthority: 'i-revoker', privateaddress: 'zs-private',
    contentmap: {key: 'value'}, contentmultimap: {key: ['value']},
  });
  Object.assign(job.request, {
    name: 'Example.VRSCTEST@', referralID: 'i-referrer', parent: job.systemId,
    parentName: 'VRSCTEST', recoveryAuthority: 'i-recovery', privateAddress: 'zs-private',
  });
  job.reservation.authorizationID = 'i-issuer';
  job.currencyNames.external = 'Currency label';
  job.identityNames.other = 'Another.Name@';
  job.fundingName = 'Funding.Parent@';
  job.request.fundingName = job.fundingName;
  job.identityNames[job.fundingAddress] = job.fundingName;
  job.unknownFutureField = {retained: true};
  expect(roundTrip(job)).toEqual(job);
});

test('retains nested partial signatures and all historical attempts while sharing their bytes', () => {
  const job = makeJob();
  const partial = {
    prepared: copy(job.commitment.prepared), hex: job.commitment.signedHex, txid: job.commitment.txid,
  };
  job.commitment.partial = partial;
  job.commitment.previousPartials = [copy(partial), copy(partial)];
  job.previousCommitments = [copy(job.commitment)];
  job.registration = copy(job.commitment);
  job.previousRegistrations = [copy(job.registration)];
  job.replacementFunding = [{txid: job.commitment.txid, vout: 0}];
  const encoded = encodeRegistrationJob(job);
  expect(encoded.pools.transactions).toHaveLength(3);
  expect(encoded.pools.plans).toHaveLength(1);
  expect(roundTrip(job)).toEqual(job);
  const summary = decodeRegistrationJob(encoded, {...context(job), summaryOnly: true});
  expect(registrationDeletionKind(summary)).toBe(registrationDeletionKind(job));
  expect(registrationCommitmentFee(summary)).toBe(registrationCommitmentFee(job));
});

test.each(['saltHex', 'identityAddress', 'displayName'])('does not silently change a mismatched %s during compaction', field => {
  const job = makeJob();
  job[field] = 'mismatched-saved-value';
  expect(roundTrip(job)).toEqual(job);
});

test.each([
  ['transaction ID', job => {job.commitment.txid = 'wrong-txid';}],
  ['transaction bytes', job => {job.commitment.signedHex = 'unreadable';}],
  ['reservation', job => {job.reservation = {bytes: 'unsupported'};}],
  ['signing address', job => {delete job.signingAddress;}],
  ['receipt', job => {job.registration = null;}],
  ['history', job => {job.previousRegistrations = {malformed: true};}],
])('rejects an invalid %s before replacing a saved record', (_label, change) => {
  const job = makeJob();
  change(job);
  const before = copy(job);
  expect(() => encodeRegistrationJob(job)).toThrow();
  expect(job).toEqual(before);
});

test('rejects unencoded jobs and unsupported storage versions', () => {
  const job = makeJob();
  expect(() => decodeRegistrationJob(job, context(job))).toThrow('Unsupported');
  expect(() => decodeRegistrationJob({format: 1}, context(job))).toThrow('Unsupported');
  expect(() => decodeRegistrationJob({format: 99}, context(job))).toThrow('Unsupported');
});

test('rejects corrupt reservation bytes and pool references', () => {
  const job = makeJob();
  const encoded = encodeRegistrationJob(job);
  encoded.reservation.bytes += '!';
  expect(() => decodeRegistrationJob(encoded, context(job))).toThrow();
  const brokenReference = encodeRegistrationJob(job);
  brokenReference.commitment.signedHex = 999;
  expect(() => decodeRegistrationJob(brokenReference, context(job))).toThrow();
});
