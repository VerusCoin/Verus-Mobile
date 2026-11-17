import {DEFAULT_MAX_FEE_RATE_PER_BYTE} from '../../electrum/transactionFee';

export const validateBTCFeeRates = (rates, maximum = DEFAULT_MAX_FEE_RATE_PER_BYTE) => {
  const values = ['slowest', 'average', 'fastest'].map(key => rates?.[key]);
  if (!values.every(value => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= maximum) ||
      values[0] > values[1] || values[1] > values[2]) return false;
  return {slowest: values[0], average: values[1], fastest: values[2]};
};
