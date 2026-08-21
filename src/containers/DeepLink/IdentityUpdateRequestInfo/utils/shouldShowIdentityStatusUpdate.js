/**
 * Whether the identity-update review UI should show a status/lock row.
 *
 * Must not throw when request details have not been parsed yet
 * (`requestedIdentity` is undefined on first paint).
 *
 * A flags change that only sets the delay lock does not change revoke
 * state, so lock-state is compared as well.
 */
export const shouldShowIdentityStatusUpdate = ({
  identityUpdates,
  identity,
  subject,
  requestedIdentity,
}) => {
  if (!identityUpdates || !identityUpdates.flags) return false;
  if (!identity || identityUpdates.flags === identity.flags) return false;
  if (!requestedIdentity) return false;

  if (
    typeof subject?.isRevoked === 'function' &&
    typeof requestedIdentity.isRevoked === 'function' &&
    subject.isRevoked() !== requestedIdentity.isRevoked()
  ) {
    return true;
  }

  if (
    typeof subject?.isLocked === 'function' &&
    typeof requestedIdentity.isLocked === 'function' &&
    subject.isLocked() !== requestedIdentity.isLocked()
  ) {
    return true;
  }

  return false;
};
