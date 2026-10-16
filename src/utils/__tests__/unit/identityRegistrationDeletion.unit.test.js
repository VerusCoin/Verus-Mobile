import {registrationCommitmentFee, registrationDeletionKind} from '../../identityRegistration/deletion';

const commitment = {signedHex: 'signed-commitment', txid: 'commitment-txid'};
const registration = {signedHex: 'signed-registration', txid: 'registration-txid'};

describe('registration deletion classification', () => {
  it('distinguishes an unpaid draft from a saved commitment, including an archived commitment', () => {
    expect(registrationDeletionKind({status: 'commitment_prepared', commitment: {prepared: {}}})).toBe('draft');
    expect(registrationDeletionKind({status: 'commitment_confirmed', commitment})).toBe('commitment');
    expect(registrationDeletionKind({status: 'registration_prepared', commitment, registration: {prepared: {}}})).toBe('commitment');
    expect(registrationDeletionKind({status: 'commitment_prepared', commitment: {prepared: {}}, previousCommitments: [commitment]})).toBe('commitment');
  });

  it.each(['registration_signed', 'registration_broadcast', 'registration_broadcast_unknown', 'registration_pending', 'registration_expired', 'needs_review'])
  ('retains a signed registration in state %s', status => {
    expect(registrationDeletionKind({status, commitment, registration})).toBeNull();
  });

  it('retains any historical signed reveal and treats an unexplained transaction ID conservatively', () => {
    expect(registrationDeletionKind({status: 'registration_prepared', commitment,
      registration: {prepared: {}}, previousRegistrations: [registration]})).toBeNull();
    expect(registrationDeletionKind({status: 'needs_review', commitment, registration: {txid: 'possibly-sent'}})).toBeNull();
    expect(registrationDeletionKind({status: 'registration_broadcast_unknown', commitment})).toBeNull();
  });

  it.each(['registered', 'complete'])('allows confirmed %s receipts while keeping signed history intact until deletion', status => {
    const job = {status, commitment, registration: {...registration, height: 12, blockHash: 'a'.repeat(64)}, previousRegistrations: [registration]};
    expect(registrationDeletionKind(job)).toBe('completed');
    expect(registrationDeletionKind({...job, registration: {...job.registration, height: 0}})).toBeNull();
    expect(registrationDeletionKind({...job, registration: {...job.registration, blockHash: undefined}})).toBeNull();
    expect(registrationDeletionKind({...job, registration: {...job.registration, signedHex: undefined}})).toBeNull();
    expect(registrationDeletionKind({...job, commitment: undefined})).toBeNull();
    expect(registrationDeletionKind({...job, commitment: {txid: commitment.txid}})).toBeNull();
    expect(registrationDeletionKind({...job, commitment: {signedHex: commitment.signedHex}})).toBeNull();
    expect(registrationDeletionKind({...job, status: 'registration_broadcast'})).toBeNull();
  });

  it('fails closed on invalid receipt histories or missing records', () => {
    expect(registrationDeletionKind(null)).toBeNull();
    expect(registrationDeletionKind({status: 'commitment_prepared', previousRegistrations: {signedHex: 'hidden'}})).toBeNull();
    expect(registrationDeletionKind({status: 'commitment_prepared', previousCommitments: {signedHex: 'hidden'}})).toBeNull();
  });

  it('uses the latest signed commitment fee when a replacement is still unsigned', () => {
    const previousCommitments = [
      {...commitment, prepared: {quote: {commitmentFee: '10000'}}},
      {...commitment, prepared: {quote: {commitmentFee: '20000'}}},
    ];
    const current = {prepared: {quote: {commitmentFee: '30000'}}};
    expect(registrationCommitmentFee({commitment: current, previousCommitments})).toBe('20000');
    expect(registrationCommitmentFee({commitment: {...commitment, ...current}, previousCommitments})).toBe('30000');
    expect(registrationCommitmentFee({commitment: current})).toBe('30000');
    expect(registrationCommitmentFee({commitment: {prepared: {quote: {commitmentFee: 'private-data'}}}})).toBeUndefined();
  });
});
