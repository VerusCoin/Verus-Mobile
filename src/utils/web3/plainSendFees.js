import {ethers} from 'ethers';
import {
  ERC20_SEND_GAS_PRICE_MODIFIER,
  MINIMUM_GAS_PRICE_GWEI,
} from '../constants/web3Constants';

export const FEE_QUOTE_TIMEOUT_MS = 10000;
const max = (a, b) => a > b ? a : b;
const min = (a, b) => a < b ? a : b;

export const withFeeTimeout = async request => {
  let timer;
  try {
    return await Promise.race([
      request,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Fee request timed out.')), FEE_QUOTE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

export const minimumMaxFeePerGas = minGasPriceGwei =>
  ethers.parseUnits(String(minGasPriceGwei ?? MINIMUM_GAS_PRICE_GWEI), 'gwei');

const unsigned = value => {
  if (value == null || !/^(0x[0-9a-f]+|\d+)$/i.test(String(value))) {
    throw new Error('Invalid gas price.');
  }
  return BigInt(value);
};

export const validateNetworkFee = (fee, floor = BigInt(0)) => {
  const maxFeePerGas = unsigned(fee.maxFeePerGas);
  const maxPriorityFeePerGas = unsigned(fee.maxPriorityFeePerGas);
  if (maxFeePerGas <= BigInt(0) || maxFeePerGas < floor || maxPriorityFeePerGas > maxFeePerGas) {
    throw new Error('Invalid network fee.');
  }
  return {maxFeePerGas, maxPriorityFeePerGas};
};

const median = values => {
  const sorted = [...values].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  return sorted[Math.floor(sorted.length / 2)];
};

// All values are integer wei. Normal retains at least the existing automatic
// cap (including the ERC-20 safety modifier) and automatic priority fee.
export const feeOptionsFromHistory = (history, automatic, floor) => {
  if (!Array.isArray(history?.baseFeePerGas) || history.baseFeePerGas.length < 2 ||
      !Array.isArray(history.reward) || !history.reward.length) {
    throw new Error('Fee history unavailable.');
  }
  const bases = history.baseFeePerGas.map(unsigned);
  const baseFeePerGas = bases[bases.length - 1]; // Next block's base fee.
  const rewards = history.reward.map(row => {
    if (!Array.isArray(row) || row.length !== 3) throw new Error('Invalid fee history.');
    const values = row.map(unsigned);
    if (values[0] > values[1] || values[1] > values[2]) throw new Error('Invalid fee history.');
    return values;
  });
  const slowMedian = median(rewards.map(row => row[0]));
  const normal = max(max(median(rewards.map(row => row[1])), automatic.maxPriorityFeePerGas), BigInt(1));
  const slow = slowMedian === BigInt(0) ? max(normal / BigInt(2), BigInt(1)) : slowMedian;
  const fast = max(median(rewards.map(row => row[2])), normal);
  const tiers = [slow, normal, fast].map((tip, index) => ({
    maxPriorityFeePerGas: tip.toString(),
    maxFeePerGas: max(max(baseFeePerGas * BigInt(2) + tip, floor),
      index > 0 ? automatic.maxFeePerGas : BigInt(0)).toString(),
  }));
  return {baseFeePerGas: baseFeePerGas.toString(), tiers};
};

export const getPlainSendFeeOptions = async (provider, minGasPriceGwei, isToken) => {
  const floor = minimumMaxFeePerGas(minGasPriceGwei);
  const data = await withFeeTimeout(provider.getFeeData());
  const marketMax = unsigned(data.maxFeePerGas);
  const automatic = validateNetworkFee({
    maxFeePerGas: max(floor, isToken
      ? marketMax + marketMax / ERC20_SEND_GAS_PRICE_MODIFIER : marketMax),
    maxPriorityFeePerGas: data.maxPriorityFeePerGas,
  }, floor);
  try {
    const history = await withFeeTimeout(provider.send('eth_feeHistory', ['0xa', 'latest', [10, 50, 90]]));
    return {...feeOptionsFromHistory(history, automatic, floor), floor: floor.toString()};
  } catch (_) {
    // The single automatic fallback has no speed label or choice affordance.
    let baseFeePerGas = null;
    try {
      const block = await withFeeTimeout(provider.getBlock('latest'));
      baseFeePerGas = unsigned(block.baseFeePerGas).toString();
    } catch (_) {}
    return {
      floor: floor.toString(), baseFeePerGas, tiers: null,
      automatic: {
        maxFeePerGas: automatic.maxFeePerGas.toString(),
        maxPriorityFeePerGas: automatic.maxPriorityFeePerGas.toString(),
      },
    };
  }
};

export const plainSendFeeAmounts = (estimatedGas, gasLimit, fee, baseFeePerGas) => {
  const {maxFeePerGas, maxPriorityFeePerGas} = validateNetworkFee(fee);
  const gas = unsigned(estimatedGas);
  const limit = unsigned(gasLimit);
  if (gas <= BigInt(0) || gas > limit) throw new Error('Gas estimate exceeds the confirmed gas limit.');
  const effectivePrice = baseFeePerGas == null ? maxFeePerGas
    : min(unsigned(baseFeePerGas) + maxPriorityFeePerGas, maxFeePerGas);
  return {
    likelyFee: ethers.formatEther(gas * effectivePrice),
    fee: ethers.formatEther(limit * maxFeePerGas),
  };
};

// Only the wizard's opt-in path uses these fields. Legacy and bridge callers
// keep their existing fee contracts.
export const confirmedPlainSendFee = params => {
  const fee = validateNetworkFee(params);
  const gasLimit = unsigned(params.gasLimit);
  if (gasLimit <= BigInt(0) || gasLimit * fee.maxFeePerGas !== unsigned(params.confirmedMaxFee)) {
    throw new Error('Network fee does not match the confirmed maximum.');
  }
  return {...fee, gasLimit};
};
