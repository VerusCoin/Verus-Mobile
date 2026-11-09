import {
  AuthenticationRequestDetails,
  AuthenticationRequestOrdinalVDXFObject,
  RecipientConstraint,
  toIAddress,
} from 'verus-typescript-primitives';
import {
  appEncryptionIdentityMatchesConstraints,
  getAppEncryptionIdentityConstraints,
} from '../../deeplink/validator/appEncryptionIdentityConstraints';

const systemID = toIAddress('VRSC', 'VRSC');
const parentID = toIAddress('namespace', 'VRSC');
const identityID = toIAddress('user.namespace', 'VRSC');
const otherID = toIAddress('other', 'VRSC');
const selected = {identityID, systemID, parentID};
const request = recipientConstraints => ({
  details: [new AuthenticationRequestOrdinalVDXFObject({
    data: new AuthenticationRequestDetails({recipientConstraints}),
  })],
});

describe('app encryption authentication constraints', () => {
  it('allows an unconstrained identity without requiring a parent', () => {
    const constraints = getAppEncryptionIdentityConstraints(request(null));

    expect(appEncryptionIdentityMatchesConstraints(constraints, {identityID, systemID})).toBe(true);
  });

  it('matches canonical identity names with OR within types and AND between types', () => {
    const constraints = getAppEncryptionIdentityConstraints(request([
      RecipientConstraint.requiredIDFromAddress(otherID),
      RecipientConstraint.requiredIDFromAddress(identityID),
      RecipientConstraint.requiredSystemFromFQN('VRSC'),
      RecipientConstraint.requiredParentFromFQN('namespace'),
      RecipientConstraint.requiredParentFromAddress(otherID),
    ]));

    expect(appEncryptionIdentityMatchesConstraints(constraints, selected)).toBe(true);

    for (const field of ['identityID', 'systemID', 'parentID']) {
      expect(appEncryptionIdentityMatchesConstraints(constraints, {...selected, [field]: toIAddress('wrong', 'VRSC')})).toBe(false);
    }
  });

  it.each([null, 'invalid', otherID])('does not substitute an ancestor or unknown parent (%s)', invalidParent => {
    const constraints = getAppEncryptionIdentityConstraints(request([
      RecipientConstraint.requiredParentFromAddress(parentID),
    ]));

    expect(appEncryptionIdentityMatchesConstraints(constraints, {...selected, parentID: invalidParent})).toBe(false);
  });

  it.each([
    {type: 99, identity: {toIAddress: () => identityID}},
    {type: RecipientConstraint.REQUIRED_ID, identity: {toIAddress: () => 'invalid'}},
    {type: RecipientConstraint.REQUIRED_ID, identity: {toIAddress: () => undefined}},
  ])('rejects malformed or unsupported signed constraints', constraint => {
    expect(() => getAppEncryptionIdentityConstraints(request([constraint]))).toThrow();
  });

  it('rejects multiple authentication requests instead of merging their alternatives', () => {
    const value = request([RecipientConstraint.requiredIDFromAddress(identityID)]);
    value.details.push(...request([RecipientConstraint.requiredIDFromAddress(otherID)]).details);

    expect(() => getAppEncryptionIdentityConstraints(value)).toThrow(/Multiple authentication/);
  });
});
