export * from './electrumVersions'
export * from './blockHeaders'

import { 
  clearCachedVersions,
  initElectrumCache
 } from './electrumVersions'
import { 
  clearCachedHeaders,
  initHeaderCache
} from './blockHeaders'

export const initCache = () => {
  return (Promise.all([initElectrumCache(), initHeaderCache()])).catch(e => {throw e})
}

export const clearCache = () => {
  return (Promise.all([clearCachedVersions(), clearCachedHeaders()])).catch(e => {throw e})
};