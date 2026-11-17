import axios from 'axios';
import {validateBTCFeeRates} from './feeRates';

const normalizeRate = value => typeof value === 'number' && value >= 0
  ? Math.max(1, Math.ceil(value)) : NaN;

export const getBlockchainComBTCFees = async maximum => {
  try {
    const response = await axios.get('https://api.blockchain.com/mempool/fees', {timeout: 10000});
    return validateBTCFeeRates({
      fastest: normalizeRate(response.data.priority),
      average: normalizeRate(response.data.regular),
      // This fallback publishes two tiers. Equal valid tiers stay equal.
      slowest: normalizeRate(response.data.regular),
    }, maximum);
  } catch (_) {
    return false;
  }
};
