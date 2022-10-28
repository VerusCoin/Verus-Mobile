import BigNumber from "bignumber.js";

export const estimateBlocktimeAtHeight = (
  chainStart,
  height,
  secondsPerBlock = 60,
) => {
  const startBn = BigNumber(chainStart);
  const heightBn = BigNumber(height);
  const secondsPerBlockBn = BigNumber(secondsPerBlock);

  return startBn.plus(heightBn.times(secondsPerBlockBn)).toString();
};
