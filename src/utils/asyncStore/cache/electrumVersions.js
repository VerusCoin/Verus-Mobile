import AsyncStorage from '@react-native-async-storage/async-storage';

import { Cache } from "react-native-cache"
//Cache library built on AsyncStorage

const ELECTRUM_SERVER_CACHE_CAP = 19

let versionCache = new Cache({
  namespace: "server_version",
  policy: {
      maxEntries: ELECTRUM_SERVER_CACHE_CAP
  },
  backend: AsyncStorage
})

//Initialize electrum cache by loading from AsyncStorage
export const initElectrumCache = () => {
  return versionCache.initializeCache().catch(e => {
    console.log("Error while initializing electrum cache")
    throw e
  })
}

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

//Get electrum server versions, to be called
//on startup and dispatched to redux store
export const getElectrumVersions = () => {
  return versionCache.getAll().catch(e => {
    console.log("Error while getting electrum cache")
    throw e
  })
}

//Clear electrum version cache
export const clearCachedVersions = () => {
  console.log("Clearing electrum version cache")
  return versionCache.clearAll().catch(e => {
    console.log("Error while clearing electrum cache")
    throw e
  })
}
