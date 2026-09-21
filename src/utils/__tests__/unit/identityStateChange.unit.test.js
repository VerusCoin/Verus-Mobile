import {buildIdentityStateChange} from '../../../containers/DeepLink/IdentityUpdateRequestInfo/utils/buildIdentityStateChange';

const buildChange = (currentIdentity, updatedIdentity, options = {}) => buildIdentityStateChange({
  currentIdentity,
  updatedIdentity,
  chainHeight: 100,
  secondsPerBlock: 60,
  ...options,
});

describe('identity state change review', () => {
  it('explains the issue254 lock and its delay without promising automatic unlocking', () => {
    const change = buildChange({flags: 0, timelock: 0}, {flags: 2, timelock: 20});
    expect(change).toMatchObject({
      key: 'identity-state',
      highRiskType: 'identity-state',
      title: 'Lock identity funds',
      before: {status: 'Unlocked', flags: '0 (no flags)', timelock: '0 (no timelock)'},
      after: {status: 'Locked — awaiting unlock request', flags: '2 (locked)'},
    });
    expect(change.after.timelock).toBe('20 blocks unlock delay + 20-block default expiry window = 40 blocks, about 40 minutes estimated wait after requesting unlock');
    expect(change.warning).toContain('20 blocks unlock delay + 20-block default expiry window = 40 blocks, about 40 minutes');
    expect(change.warning).toContain('Setting this lock does not start the waiting period');
    expect(change.lockExplanation).toContain("unlock transaction's expiry height plus the 20-block delay");
    expect(change.lockExplanation).toContain('longer than the stated delay');
    expect(change.lockExplanation).toContain('time to respond to compromised primary keys');
    expect(change.lockExplanation).toContain('Identity updates and data signatures remain possible');
    expect(change.lockExplanation).toContain('copies on other chains are unaffected');
    expect(change.lockExplanation).toContain('only when the identity’s authority settings permit');
  });

  it('shows a delay-only change and merges omitted flags', () => {
    const change = buildChange({flags: 2, timelock: 20}, {timelock: 40});
    expect(change.title).toBe('Change unlock delay');
    expect(change.before.timelock).toContain('20 blocks unlock delay');
    expect(change.after.timelock).toContain('40 blocks unlock delay');
    expect(change.before.timelock).toContain('= 40 blocks, about 40 minutes');
    expect(change.after.timelock).toContain('= 60 blocks, about 1 hour');
    expect(change.warning).toContain('40 blocks unlock delay + 20-block default expiry window = 60 blocks, about 1 hour');
    expect(change.after.flags).toBe('2 (locked)');
  });

  it('preserves explicit zero flags and distinguishes a prepared countdown from its old delay', () => {
    const change = buildChange({flags: 2, timelock: 20}, {flags: 0, timelock: 140});
    expect(change.title).toBe('Start identity unlock');
    expect(change.after.flags).toBe('0 (no flags)');
    expect(change.after.status).toBe('Locked — counting down');
    expect(change.after.timelock).toBe('140 (unlock after this block; spending from block 141)');
    expect(change.after.timelock).not.toContain('expiry window');
    expect(change.lockExplanation).toContain('This unlock update starts the countdown once confirmed');
    expect(change.lockExplanation).not.toContain('later confirmed unlock update');
  });

  it('shows explicit zero timelock and preserves omitted flags', () => {
    const change = buildChange({flags: 1, timelock: 90}, {timelock: 0});
    expect(change.after).toEqual({status: 'Unlocked', flags: '1 (active currency)', timelock: '0 (no timelock)'});
    expect(change.title).toBe('Clear identity timelock');
  });

  it.each([
    [99, 'Locked — counting down'],
    [100, 'Unlocked — timelock elapsed'],
    [101, 'Unlocked — timelock elapsed'],
    [undefined, 'Unlock height set — current height unknown'],
  ])('evaluates absolute timelocks for spending in the next block at tip %s', (chainHeight, status) => {
    const change = buildChange({flags: 0, timelock: 0}, {timelock: 100}, {chainHeight});
    expect(change.after.status).toBe(status);
    expect(change.after.timelock).toContain('spending from block 101');
  });

  it('does not reinterpret a delay as an absolute height when the height is greater', () => {
    const change = buildChange({flags: 0}, {flags: 2, timelock: 20}, {chainHeight: 999999});
    expect(change.after.status).toBe('Locked — awaiting unlock request');
  });

  it.each([{}, {flags: 2}, {timelock: 20}, {flags: 2, timelock: 20}, {flags: '2', timelock: '20'}])(
    'omits unchanged state, including omitted fields: %s', updatedIdentity => {
      expect(buildChange({flags: 2, timelock: 20}, updatedIdentity)).toBeNull();
    },
  );

  it('shows changed semantics even when only the lock flag changes', () => {
    const change = buildChange({flags: 0, timelock: 200}, {flags: 2});
    expect(change.title).toBe('Relock identity funds');
    expect(change.before.timelock).toContain('unlock after this block');
    expect(change.after.timelock).toContain('200 blocks unlock delay');
  });

  it('gives revocation precedence over locking and retains exact flag bits', () => {
    const change = buildChange({flags: 2, timelock: 20}, {flags: 32770});
    expect(change.title).toBe('Revoke identity');
    expect(change.after.status).toBe('Revoked');
    expect(change.after.flags).toBe('32770 (revoked, locked)');
    expect(change.after.timelock).toContain('inactive while revoked');
    expect(change.warning).toContain('Authorized recovery is required');
  });

  it('does not describe revocation clearing a lock as starting an unlock countdown', () => {
    const change = buildChange({flags: 2, timelock: 20}, {flags: 32768, timelock: 0});
    expect(change.after.status).toBe('Revoked');
    expect(change.warning).toContain('cannot authorize ordinary spending');
    expect(change.lockExplanation).not.toContain('starts the countdown');
    expect(change.lockExplanation).not.toContain('earliest release height');
  });

  it('describes recovery without confusing a cleared revoked flag with an unchanged zero', () => {
    const change = buildChange({flags: 32768, timelock: 0}, {flags: 0});
    expect(change.title).toBe('Recover identity');
    expect(change.before.status).toBe('Revoked');
    expect(change.after.status).toBe('Unlocked');
  });

  it('does not apply an inactive revoked delay to recovery', () => {
    const change = buildChange({flags: 32770, timelock: 20}, {flags: 0, timelock: 0}, {prepared: false});
    expect(change.title).toBe('Recover identity');
    expect(change.after.status).toBe('Unlocked');
    expect(change.lockExplanation).not.toContain('20-block delay');
  });

  it('shows other and unknown flags and their effects', () => {
    const change = buildChange({flags: 0, timelock: 0}, {flags: 13});
    expect(change.after.flags).toBe('13 (active currency, tokenized control, unrecognized bits: 8)');
    expect(change.warning).toContain('active currency');
    expect(change.warning).toContain('control-token holder to revoke and recover');
    expect(change.warning).toContain('Unrecognized flag bits are changing');
  });

  it.each([2, 0])('does not label other flag changes as a changed delay or height: %s', flags => {
    const change = buildChange({flags, timelock: 200}, {flags: flags | 1});
    expect(change.title).toBe('Change identity flags');
    expect(change.warning).toContain('active currency');
  });

  it('does not claim an unprepared zero-valued unlock immediately frees funds', () => {
    const change = buildChange({flags: 2, timelock: 20}, {flags: 0, timelock: 0}, {prepared: false});
    expect(change.title).toBe('Request identity unlock');
    expect(change.after.status).toBe('Unlock requested — delay still applies');
    expect(change.after.timelock).toContain('0 (requested value; actual unlock height determined');
    expect(change.warning).toContain('not immediate access');
    expect(change.warning).toContain('includes the existing delay and transaction expiry window');
    expect(change.warning).toContain('20-block default expiry window = 40 blocks, about 40 minutes');
  });

  it('preserves a requested zero delay while explaining normalization during preparation', () => {
    const change = buildChange({flags: 0, timelock: 0}, {flags: 2, timelock: 0}, {prepared: false});
    expect(change.after.status).toBe('Locked — awaiting unlock request');
    expect(change.after.timelock).toContain('0 (requested unlock delay; normalized to 1 block when the transaction is prepared)');
    expect(change.after.timelock).toContain('1 block unlock delay + 20-block default expiry window = 21 blocks, about 21 minutes');
    expect(change.warning).toContain('zero delay is normalized to one block');
    expect(change.warning).toContain('1 block unlock delay + 20-block default expiry window = 21 blocks, about 21 minutes');
    expect(change.lockExplanation).toContain('1 block unlock delay + 20-block default expiry window = 21 blocks, about 21 minutes');
  });

  it('omits time estimates when block time is unavailable', () => {
    expect(buildChange({flags: 0}, {flags: 2, timelock: 20}, {secondsPerBlock: undefined}).after.timelock)
      .toBe('20 blocks unlock delay + 20-block default expiry window = 40 blocks estimated wait after requesting unlock');
  });

  it('uses the daemon default expiry window for a faster chain', () => {
    const change = buildChange({flags: 0}, {flags: 2, timelock: 20}, {secondsPerBlock: 10});
    expect(change.after.timelock).toContain('20 blocks unlock delay + 60-block default expiry window = 80 blocks');
  });
});
