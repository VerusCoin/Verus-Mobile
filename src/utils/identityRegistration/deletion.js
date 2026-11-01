const hasSignedReceipt = receipt => !!(receipt?.signedHex || receipt?.txid);
const registrationDeliveryStates = new Set([
  'registration_signed', 'registration_broadcast', 'registration_broadcast_unknown',
]);

// Expired replacements can have an unsigned current transaction. The warning
// must describe the signed commitment being abandoned, not its new estimate.
export const registrationCommitmentFee = job => {
  const history = Array.isArray(job?.previousCommitments) ? job.previousCommitments : [];
  const receipt = hasSignedReceipt(job?.commitment) ? job.commitment :
    [...history].reverse().find(hasSignedReceipt) || job?.commitment;
  const amount = receipt?.prepared?.quote?.commitmentFee;
  return typeof amount === 'string' && /^\d+$/.test(amount) ? amount : undefined;
};

// This describes the saved receipt, not current chain evidence. Before deleting
// a completed registration, the caller must verify its confirmation again.
// Public reviews and summaries expose only the returned classification.
export const registrationDeletionKind = job => {
  if (!job || (job.previousCommitments != null && !Array.isArray(job.previousCommitments)) ||
    (job.previousRegistrations != null && !Array.isArray(job.previousRegistrations))) return null;

  const completed = ['registered', 'complete'].includes(job.status);
  const registration = job.registration;
  if (completed) {
    return job.commitment?.signedHex && job.commitment.txid &&
      registration?.signedHex && registration.txid &&
      Number.isSafeInteger(registration.height) && registration.height > 0 &&
      typeof registration.blockHash === 'string' && /^[0-9a-f]{64}$/i.test(registration.blockHash)
      ? 'completed' : null;
  }

  // Signed registrations must remain recoverable even after a broadcast error,
  // expiry, or replacement. Losing their receipt can hide a later payment.
  if (registrationDeliveryStates.has(job.status) ||
    [registration, ...(job.previousRegistrations || [])].some(hasSignedReceipt)) return null;

  return [job.commitment, ...(job.previousCommitments || [])].some(hasSignedReceipt)
    ? 'commitment' : 'draft';
};
