import {primitives} from 'verusid-ts-client';
import {blocksToTime} from '../math';

export const VERUSID_STATE = {
  ACTIVE: 'active',
  LOCKED: 'locked',
  REVOKED: 'revoked',
};

// The state of a VerusID for the signed-in VerusID page. It follows
// getVerusIdStatus: a revoked VerusID is revoked; a timelock delay, or an
// unlock height above the chain tip, locks it. `unlock` says when a locked
// VerusID unlocks, when that is known.
//
// identityJson is the inner `identity` object of a getidentity result.
// chainInfo is a getinfo result for the VerusID's system, or null.
export const describeVerusIdState = (
  identityJson,
  chainInfo = null,
  secondsPerBlock = 60,
  rpcStatus = null,
) => {
  let verusId;

  try {
    verusId = primitives.PartialIdentity.fromJson(identityJson);
  } catch (e) {
    return {
      state:
        rpcStatus === VERUSID_STATE.REVOKED
          ? VERUSID_STATE.REVOKED
          : VERUSID_STATE.ACTIVE,
      unlock: null,
    };
  }

  if (verusId.isRevoked() || rpcStatus === VERUSID_STATE.REVOKED) {
    return {state: VERUSID_STATE.REVOKED, unlock: null};
  }

  const unlockAfter = verusId.unlockAfter;

  if (verusId.isLocked()) {
    const blocks = unlockAfter ? unlockAfter.toNumber() + 20 : null;

    return {
      state: VERUSID_STATE.LOCKED,
      unlock:
        blocks == null
          ? null
          : `Unlocks about ${blocksToTime(
              blocks,
              secondsPerBlock,
            )} after you request it`,
    };
  }

  const longestChain = Number(chainInfo?.longestchain);

  if (
    unlockAfter &&
    Number.isFinite(longestChain) &&
    unlockAfter.gt(new primitives.BigNumber(longestChain))
  ) {
    const blocks = unlockAfter.toNumber() - longestChain;

    return {
      state: VERUSID_STATE.LOCKED,
      unlock: `Unlocks in about ${blocksToTime(blocks, secondsPerBlock)}`,
    };
  }

  return {state: VERUSID_STATE.ACTIVE, unlock: null};
};

export const getVerusIdStateBadge = state => {
  if (state === VERUSID_STATE.LOCKED) {
    return {label: 'Locked', tone: 'warning'};
  }
  if (state === VERUSID_STATE.REVOKED) {
    return {label: 'Revoked', tone: 'danger'};
  }

  return null;
};
