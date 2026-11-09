import { blocksToTime } from '../math';

// Presentation uses scalar fields only: opaque binary content may deliberately
// have no daemon-JSON roundtrip. Transaction validity is checked by the SDK.
export const getVerusIdStatus = (identity, chainInfo, blocktime) => {
  const flags = Number(identity.flags || 0);
  const timelock = Number(identity.timelock || 0);
  const activeHeight = chainInfo?.blocks;
  if (flags & 0x8000) return 'Revoked';
  if (flags & 2) {
    const blockDelay = timelock + 20;
    return `Locked, will unlock about ${blocksToTime(blockDelay, blocktime)} (${blockDelay} blocks) after unlock is requested.`;
  }
  if (timelock > 0) {
    if (!Number.isSafeInteger(activeHeight) || activeHeight < 0) return 'Unlock height set — current height unavailable.';
    if (timelock > activeHeight) {
      const unlockFromNow = timelock - activeHeight;
      return `Locked, will unlock in about ${blocksToTime(unlockFromNow, blocktime)} (${unlockFromNow} blocks, spending from block ${timelock + 1}).`;
    }
  }
  return 'Active and unlocked';
};
