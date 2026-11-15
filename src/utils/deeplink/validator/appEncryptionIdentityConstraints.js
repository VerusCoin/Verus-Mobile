import {
  AuthenticationRequestOrdinalVDXFObject,
  fromBase58Check,
  I_ADDR_VERSION,
  RecipientConstraint,
} from 'verus-typescript-primitives';

const canonicalIdentity = address => {
  const decoded = fromBase58Check(address);

  if (decoded.version !== I_ADDR_VERSION || decoded.hash.length !== 20) {
    throw new Error('Invalid authentication identity constraint.');
  }

  return address;
};

export const getAppEncryptionIdentityConstraints = request => {
  const constraints = {identityIDs: new Set(), systemIDs: new Set(), parentIDs: new Set()};
  const groups = {
    [RecipientConstraint.REQUIRED_ID]: constraints.identityIDs,
    [RecipientConstraint.REQUIRED_SYSTEM]: constraints.systemIDs,
    [RecipientConstraint.REQUIRED_PARENT]: constraints.parentIDs,
  };
  const authentication = request.details.filter(detail =>
    detail instanceof AuthenticationRequestOrdinalVDXFObject);

  if (authentication.length > 1) throw new Error('Multiple authentication requests are unsupported.');

  for (const detail of authentication) {
    if (!detail.data?.isValid()) throw new Error('Invalid authentication request details.');

    for (const constraint of detail.data.recipientConstraints || []) {
      const group = groups[constraint.type];

      if (!group) throw new Error('Unsupported authentication identity constraint.');
      group.add(canonicalIdentity(constraint.identity.toIAddress()));
    }
  }

  return constraints;
};

// Alternatives within a constraint type are ORed; every requested type must
// match. Use the current identity record's immediate parent, not an ancestor.
export const appEncryptionIdentityMatchesConstraints = (
  constraints,
  {identityID, systemID, parentID},
) => {
  try {
    canonicalIdentity(identityID);
    canonicalIdentity(systemID);

    return (
      (!constraints.identityIDs.size || constraints.identityIDs.has(identityID)) &&
      (!constraints.systemIDs.size || constraints.systemIDs.has(systemID)) &&
      (!constraints.parentIDs.size || constraints.parentIDs.has(canonicalIdentity(parentID)))
    );
  } catch (_) {
    return false;
  }
};
