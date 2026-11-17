import axios from 'axios';
import BigNumber from 'bignumber.js';
import { REQUEST_TIMEOUT_MS } from '../../../../../../env/index';

const CACHE_MS = 15 * 60 * 1000;
const cache = new Map();

export const getCoinPaprikaId = (coinObj) => {
  if (coinObj.proto === 'vrsc' || coinObj.testnet) return null;
  if (coinObj.rate_url_params?.coin_paprika) return coinObj.rate_url_params.coin_paprika;
  // Listed ticker IDs retain the existing CoinPaprika name convention. A
  // searched ERC-20 contract has no CoinPaprika ID; do not request its address.
  if (coinObj.unlisted || !['btc', 'eth', 'erc20'].includes(coinObj.proto)
      || coinObj.id.startsWith('0x')) return null;
  return `${coinObj.id.toLowerCase()}-${coinObj.display_name.replace(/ /g, '-').toLowerCase()}`;
};

export const getCoinPaprikaRate = (coinObj) => {
  const id = getCoinPaprikaId(coinObj);
  if (!id) return Promise.resolve({ result: { rate: null, source: null } });
  const entry = cache.get(id);
  if (entry && Date.now() < entry.expiresAt) return entry.promise;

  const address = `https://api.coinpaprika.com/v1/tickers/${id}`;
  const promise = axios.get(address, { timeout: REQUEST_TIMEOUT_MS })
    .then(({ data }) => {
      const rate = data?.quotes?.USD?.price;
      const number = BigNumber(rate);
      if (rate == null || !number.isFinite() || !number.isGreaterThan(0)) {
        throw new Error(`Failed to get price for ${coinObj.id} through CoinPaprika API.`);
      }
      return { result: { rate, source: address } };
    })
    .catch((error) => {
      // Do not hold a failure for 15 minutes: the next price refresh retries.
      cache.delete(id);
      return { error };
    });
  cache.set(id, { promise, expiresAt: Date.now() + CACHE_MS });
  return promise;
};
