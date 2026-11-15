import {createPersistentCache} from './createPersistentCache';

const ELECTRUM_SERVER_CACHE_CAP = 19
const ELECTRUM_CACHE_NAMESPACE = "server_version"
const validElectrumVersion = value =>
  typeof value === 'number' && Number.isFinite(value);

const {
  cache: versionCache,
  initialize: initElectrumCache,
  getAll: getElectrumVersions,
  clear: clearCachedVersions,
} = createPersistentCache({
  namespace: ELECTRUM_CACHE_NAMESPACE,
  maxEntries: ELECTRUM_SERVER_CACHE_CAP,
  validateValue: validElectrumVersion,
  name: 'electrum',
  clearMessage: 'Clearing electrum version cache',
  getAllOperation: 'getting',
});

export {initElectrumCache, getElectrumVersions, clearCachedVersions};

//Store version numbers for each loaded electrum server
//so we don't have to keep checking
export const setElectrumVersion = (server, version) => {
  let serverCleaned = server.replace(/:/g, "|");
  //Replace colons with '|', as cache library uses colons to create namespaces

  return versionCache.setItem(serverCleaned, version).catch(e => {
    console.log("Error while setting electrum cache")
    throw e
  })
}
