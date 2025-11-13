import { primitives } from "verusid-ts-client";
import { blocksToTime } from "../math";

export const getVerusIdStatus = (verusIdJson, chainInfo, blocktime) => {
  const verusId = primitives.PartialIdentity.fromJson(verusIdJson);

  const isTimelockDelay = verusId.isLocked();
  const isBlockheightUnlock = chainInfo && 
                              verusId.unlock_after && 
                              verusId.unlock_after.gt(new primitives.BigNumber(chainInfo.longestchain));
  
  if (isTimelockDelay && !verusId.unlock_after) {
    throw new Error("Cannot determine unlock time for timelock delay.");
  }

  if (verusId.isRevoked()) return "Revoked";
  else if (isTimelockDelay) {
    const blockDelay = verusId.unlock_after.toNumber() + 20;

    return `Locked, will unlock about ${blocksToTime(blockDelay, blocktime)} (${blockDelay} blocks) after unlock is requested.`;
  } else if (isBlockheightUnlock) {
    const unlockFromNow = verusId.unlock_after.sub(new primitives.BigNumber(chainInfo.longestchain)).toNumber();

    return `Locked, will unlock in about ${blocksToTime(unlockFromNow, blocktime)} (${unlockFromNow} blocks, at block ${verusId.unlock_after.toNumber()}).`;
  } else return "Active and unlocked";
}