import axios from 'axios';
import {validateBTCFeeRates} from './feeRates';

export const getMempoolSpaceBTCFees = async (maximum, testnet = false) => {
  try {
    const response = await axios.get(
      `https://mempool.space/${testnet ? 'testnet/' : ''}api/v1/fees/recommended`,
      {timeout: 10000},
    );
    return validateBTCFeeRates({
      fastest: response.data.fastestFee,
      average: response.data.halfHourFee,
      slowest: response.data.hourFee,
    }, maximum);
  } catch (_) {
    return false;
  }
};
