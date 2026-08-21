import {shouldShowIdentityStatusUpdate} from './shouldShowIdentityStatusUpdate';

const identity = (flags, {revoked = false, locked = false} = {}) => ({
  flags,
  isRevoked: () => revoked,
  isLocked: () => locked,
});

describe('shouldShowIdentityStatusUpdate', () => {
  it('does not throw and hides the row when details.identity is not parsed yet', () => {
    expect(() =>
      shouldShowIdentityStatusUpdate({
        identityUpdates: {flags: 2},
        identity: identity(0),
        subject: identity(0),
        requestedIdentity: undefined,
      }),
    ).not.toThrow();

    expect(
      shouldShowIdentityStatusUpdate({
        identityUpdates: {flags: 2},
        identity: identity(0),
        subject: identity(0),
        requestedIdentity: undefined,
      }),
    ).toBe(false);
  });

  it('shows the status row when flags add a delay lock', () => {
    expect(
      shouldShowIdentityStatusUpdate({
        identityUpdates: {flags: 2},
        identity: identity(0),
        subject: identity(0, {revoked: false, locked: false}),
        requestedIdentity: identity(2, {revoked: false, locked: true}),
      }),
    ).toBe(true);
  });

  it('hides the status row when flags are unchanged (address-only update)', () => {
    expect(
      shouldShowIdentityStatusUpdate({
        identityUpdates: {flags: 0},
        identity: identity(0),
        subject: identity(0),
        requestedIdentity: identity(0),
      }),
    ).toBe(false);

    expect(
      shouldShowIdentityStatusUpdate({
        identityUpdates: {},
        identity: identity(0),
        subject: identity(0),
        requestedIdentity: identity(0),
      }),
    ).toBe(false);
  });

  it('shows the status row when revoke state changes', () => {
    expect(
      shouldShowIdentityStatusUpdate({
        identityUpdates: {flags: 128},
        identity: identity(0),
        subject: identity(0, {revoked: false, locked: false}),
        requestedIdentity: identity(128, {revoked: true, locked: false}),
      }),
    ).toBe(true);
  });
});
