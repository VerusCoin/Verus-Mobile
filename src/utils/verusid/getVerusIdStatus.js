import { primitives } from "verusid-ts-client";
import { blocksToTime } from "../math";

export const getVerusIdStatus = (verusIdJson, chainInfo, blocktime) => {
  const verusId = primitives.PartialIdentity.fromJson(verusIdJson);

  const isTimelockDelay = verusId.isLocked();
  const isBlockheightUnlock = chainInfo &&
                              verusId.unlockAfter &&
                              verusId.unlockAfter.gt(new primitives.BigNumber(chainInfo.longestchain));

  if (isTimelockDelay && !verusId.unlockAfter) {
    throw new Error("Cannot determine unlock time for timelock delay.");
  }

  if (verusId.isRevoked()) return "Revoked";
  else if (isTimelockDelay) {
    const blockDelay = verusId.unlockAfter.toNumber() + 20;

    return `Locked, will unlock about ${blocksToTime(blockDelay, blocktime)} (${blockDelay} blocks) after unlock is requested.`;
  } else if (isBlockheightUnlock) {
    const unlockFromNow = verusId.unlockAfter.sub(new primitives.BigNumber(chainInfo.longestchain)).toNumber();

    return `Locked, will unlock in about ${blocksToTime(unlockFromNow, blocktime)} (${unlockFromNow} blocks, at block ${verusId.unlockAfter.toNumber()}).`;
  } else return "Active and unlocked";
}