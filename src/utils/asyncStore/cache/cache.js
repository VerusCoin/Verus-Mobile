export * from './electrumVersions'
export * from './blockHeaders'
export * from './ethTxReceipts'

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

export const initCache = () => {
  return Promise.all([
    initElectrumCache(),
    initHeaderCache(),
    initEthTxReceiptCache(),
  ]).catch((e) => {
    throw e;
  });
}

export const clearCache = () => {
  return Promise.all([
    clearCachedVersions(),
    clearCachedHeaders(),
    clearCachedEthTxReceipts(),
  ]).catch((e) => {
    throw e;
  });
};