import {
  getHeaderCache,
  setCachedHeader,
  BLOCK_HEADER_CACHE_CAP
} from '../../../utils/asyncStore/asyncStore';

import {
  setBlockHeaders,
  addBlockHeader
} from '../../actionCreators'

//Load cached headers into store and pass in dispatch object
export const loadCachedHeaders = (dispatch) => {
  return new Promise((resolve) => {
    getHeaderCache()
    .then(headerList => {
      let headerListParsed = {}

      for (let key in headerList) {
        headerListParsed[key] = headerList[key] ? headerList[key].value : null;
      }

      dispatch(setBlockHeaders(headerListParsed))
      resolve()
    })
    .catch(e => {
      throw e
    })
  })
}

//Add header to cache and store, check if store is bigger, if yes,
//set store to mirror cache
export const saveBlockHeader = (header, height, coinID, store) => {
  let numHeaders = Object.keys(store.getState().headers.headers).length

  return new Promise((resolve, reject) => {
    setCachedHeader(header, height, coinID)
    .then(() => {
      if (numHeaders < global.BLOCK_HEADER_STORE_CAP) {
        return false
      } else {
        return loadCachedHeaders(store.dispatch)
      }
    })
    .then(() => {
      resolve()
    })
    .catch(e => {
      throw e
    })
  })
}