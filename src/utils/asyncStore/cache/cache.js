export * from './electrumVersions'
export * from './blockHeaders'
export * from './ethTxReceipts'
export * from './vrpcResponseCache'
import { clearPortfolioPriceCache } from '../../portfolioHistory/priceCache';

import { 
  clearCachedVersions,
  initElectrumCache
 } from './electrumVersions'
import { 
  clearCachedHeaders,
  initHeaderCache
} from './blockHeaders'
import { 
  initEthTxReceiptCache,
  clearCachedEthTxReceipts
} from './ethTxReceipts'
import { 
  initVrpcResponseCache,
  clearCachedVrpcResponses
} from './vrpcResponseCache'

export const initCache = () => {
  return Promise.all([
    initElectrumCache(),
    initHeaderCache(),
    initEthTxReceiptCache(),
    initVrpcResponseCache()
  ]).catch((e) => {
    throw e;
  });
}

export const clearCache = () => {
  return Promise.all([
    clearCachedVersions(),
    clearCachedHeaders(),
    clearCachedEthTxReceipts(),
    clearCachedVrpcResponses(),
    clearPortfolioPriceCache()
  ]).catch((e) => {
    throw e;
  });
};
