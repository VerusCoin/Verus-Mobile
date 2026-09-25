// CIdentity flags and lock rules: VerusCoin/src/pbaas/identity.{h,cpp}.
const ACTIVE_CURRENCY = 1;
const LOCKED = 2;
const TOKENIZED_CONTROL = 4;
const REVOKED = 0x8000;
const KNOWN_FLAGS = ACTIVE_CURRENCY | LOCKED | TOKENIZED_CONTROL | REVOKED;

const describeFlags = flags => {
  const names = [];
  if (flags & REVOKED) names.push('revoked');
  if (flags & LOCKED) names.push('locked');
  if (flags & ACTIVE_CURRENCY) names.push('active currency');
  if (flags & TOKENIZED_CONTROL) names.push('tokenized control');
  const unknown = (flags & ~KNOWN_FLAGS) >>> 0;
  if (unknown) names.push(`unrecognized bits: ${unknown}`);
  return `${flags} (${names.join(', ') || 'no flags'})`;
};

const approximateDelay = (blocks, secondsPerBlock) => {
  if (!(blocks > 0 && Number.isFinite(secondsPerBlock) && secondsPerBlock > 0)) return '';
  const seconds = blocks * secondsPerBlock;
  const [unit, divisor] = seconds >= 86400 ? ['day', 86400]
    : seconds >= 3600 ? ['hour', 3600]
    : seconds >= 60 ? ['minute', 60] : ['second', 1];
  const amount = Math.round(seconds / divisor * 10) / 10;
  return `, about ${amount} ${unit}${amount === 1 ? '' : 's'}`;
};

const describeUnlockDelay = (delay, secondsPerBlock) => {
  // VerusCoin/src/rpc/pbaasrpc.cpp: default expiry is 20 blocks on 60s chains,
  // scaled (and capped at 60) for faster chains. A daemon can override it.
  const expiryWindow = Number.isFinite(secondsPerBlock) && secondsPerBlock > 0
    ? Math.max(20, Math.min(60, Math.floor(20 * 60 / secondsPerBlock)))
    : 20;
  const total = delay + expiryWindow;
  return `${delay} ${delay === 1 ? 'block' : 'blocks'} unlock delay + ${expiryWindow}-block default expiry window = ${total} blocks${approximateDelay(total, secondsPerBlock)} estimated wait after requesting unlock`;
};

const describeState = (flags, timelock, chainHeight, secondsPerBlock) => {
  const revoked = !!(flags & REVOKED);
  const locked = !!(flags & LOCKED);
  const hasHeight = Number.isSafeInteger(chainHeight) && chainHeight >= 0;
  // Spending is checked at the next block, not the current chain tip.
  const countingDown = hasHeight && timelock > chainHeight;
  const status = revoked ? 'Revoked'
    : locked ? 'Locked — awaiting unlock request'
    : timelock === 0 ? 'Unlocked'
    : !hasHeight ? 'Unlock height set — current height unknown'
    : countingDown ? 'Locked — counting down'
    : 'Unlocked — timelock elapsed';
  const timelockLabel = locked
    ? describeUnlockDelay(timelock, secondsPerBlock)
    : timelock === 0 ? '0 (no timelock)'
    : `${timelock} (unlock after this block; spending from block ${timelock + 1})`;

  return {
    status,
    flags: describeFlags(flags),
    timelock: `${timelockLabel}${revoked && timelock !== 0 ? ' — inactive while revoked' : ''}`,
  };
};

/** Identity JSON inputs; chainHeight is the current chain tip. */
export const buildIdentityStateChange = ({
  currentIdentity = {},
  updatedIdentity = {},
  chainHeight,
  secondsPerBlock,
  prepared = true,
}) => {
  const oldFlags = Number(currentIdentity.flags ?? 0);
  const oldTimelock = Number(currentIdentity.timelock ?? 0);
  const flags = Number(updatedIdentity.flags ?? oldFlags);
  const timelock = Number(updatedIdentity.timelock ?? oldTimelock);
  if (oldFlags === flags && oldTimelock === timelock) return null;

  const wasLocked = !!(oldFlags & LOCKED);
  const wasRevoked = !!(oldFlags & REVOKED);
  const locked = !!(flags & LOCKED);
  const revoked = !!(flags & REVOKED);
  const requestedZeroDelay = !prepared && !wasLocked && locked && timelock === 0;
  const before = describeState(oldFlags, oldTimelock, chainHeight, secondsPerBlock);
  const after = describeState(flags, timelock, chainHeight, secondsPerBlock);
  let title;
  let warning;
  let lockExplanation;

  if (revoked) {
    title = oldFlags & REVOKED ? 'Change revoked identity state' : 'Revoke identity';
    warning = 'A revoked identity cannot authorize ordinary spending or new data signatures. Authorized recovery is required to restore it; removing a timelock does not restore a revoked identity.';
  } else if (wasLocked && !wasRevoked && !locked && !prepared) {
    title = 'Request identity unlock';
    after.status = 'Unlock requested — delay still applies';
    after.timelock = `${timelock} (requested value; actual unlock height determined when the transaction is prepared)`;
    warning = `This requests unlocking, not immediate access to funds. The waiting period includes the existing delay and transaction expiry window: ${describeUnlockDelay(oldTimelock, secondsPerBlock)}. A later requested unlock height may extend the wait.`;
  } else if (locked) {
    title = wasLocked ? oldTimelock === timelock ? 'Change identity flags' : 'Change unlock delay'
      : oldTimelock > 0 ? 'Relock identity funds' : 'Lock identity funds';
    warning = `Spending from this identity on this blockchain will be locked until a later unlock update and its waiting period have completed. Expected timing: ${describeUnlockDelay(requestedZeroDelay ? 1 : timelock, secondsPerBlock)}. Setting this lock does not start the waiting period.`;
    if (requestedZeroDelay) {
      after.timelock = `0 (requested unlock delay; normalized to 1 block when the transaction is prepared). ${describeUnlockDelay(1, secondsPerBlock)}`;
      warning += ' A requested zero delay is normalized to one block.';
    }
  } else if (timelock > 0) {
    title = wasLocked ? 'Start identity unlock' : oldTimelock === timelock ? 'Change identity flags' : 'Change unlock height';
    warning = `This timelock blocks spending through block ${timelock}; spending can resume from block ${timelock + 1}. This is an absolute block height, not a delay in blocks.`;
    if (Number.isSafeInteger(chainHeight) && chainHeight >= timelock) {
      warning += ' This height has already been reached, so the timelock no longer prevents spending in the next block.';
    }
  } else {
    title = oldFlags & REVOKED ? 'Recover identity' : oldTimelock || wasLocked ? 'Clear identity timelock' : 'Change identity flags';
    warning = oldFlags & REVOKED
      ? 'This restores the identity from revoked status with no spending timelock.'
      : 'No identity spending lock remains in the resulting state.';
  }

  if (wasRevoked && !revoked && (locked || timelock > 0)) {
    title = 'Recover identity';
    warning = `This restores the identity from revoked status. ${warning}`;
  }

  if ((oldFlags ^ flags) & ACTIVE_CURRENCY) {
    warning += flags & ACTIVE_CURRENCY
      ? ' This marks the identity as an active currency.'
      : ' This removes the active-currency flag.';
  }
  if ((oldFlags ^ flags) & TOKENIZED_CONTROL) {
    warning += flags & TOKENIZED_CONTROL
      ? ' Tokenized control allows the control-token holder to revoke and recover this identity.'
      : ' This removes tokenized revocation and recovery control.';
  }
  if ((oldFlags ^ flags) & ~KNOWN_FLAGS) {
    warning += ' Unrecognized flag bits are changing; their effects are not described here.';
  }

  if (wasLocked !== locked || oldTimelock !== timelock) {
    lockExplanation = 'A lock limits spending from this identity on this blockchain. The delay gives you time to respond to compromised primary keys before funds can be spent. Identity updates and data signatures remain possible while it is unrevoked, and copies on other chains are unaffected.';
    if (!revoked && (locked || (wasLocked && !wasRevoked))) {
      const delay = locked ? requestedZeroDelay ? 1 : timelock : oldTimelock;
      lockExplanation += locked
        ? '\n\nA later confirmed unlock update is required. Its waiting period includes both the configured delay and the transaction expiry window. '
        : '\n\nThis unlock update starts the countdown once confirmed. ';
      lockExplanation += `The earliest release height is the unlock transaction's expiry height plus the ${delay}-block delay. This makes the wait longer than the stated delay: ${describeUnlockDelay(delay, secondsPerBlock)}. Custom transaction expiry settings or a later requested height change this estimate. Spending becomes available in the block after the resulting unlock height.`;
    }
    if (!revoked && !locked && timelock > 0 && prepared) {
      lockExplanation += `\n\nThe resulting absolute timelock is block ${timelock}: funds stay locked through that block and are usable from block ${timelock + 1}.`;
    }
    lockExplanation += '\n\nThe waiting period cannot normally be shortened. Authorized revocation and recovery can bypass it only when the identity’s authority settings permit; revocation alone does not make funds spendable.';
  }

  return {key: 'identity-state', highRiskType: 'identity-state', title, warning, before, after, lockExplanation};
};
