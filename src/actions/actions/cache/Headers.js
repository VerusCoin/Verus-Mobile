import {
  getHeaderCache,
  setCachedHeader,
  clearCachedHeaders,
} from '../../../utils/asyncStore/asyncStore';

import { BLOCK_HEADER_STORE_CAP } from '../../../../env/index'

import {
  setBlockHeaders
} from '../../actionCreators'

//Load cached headers into store and pass in dispatch object
export const loadCachedHeaders = async dispatch => {
  const headerList = await getHeaderCache();
  let headerListParsed = {};

  try {
    if (headerList == null || typeof headerList !== "object" || Array.isArray(headerList)) {
      throw new Error("Invalid block header cache");
    }

    for (const key of Object.keys(headerList)) {
      const entry = headerList[key];
      if (entry != null && !("value" in entry)) {
        throw new Error("Invalid block header cache entry");
      }

      if (entry != null) {
        if (typeof entry.value !== "string") {
          throw new Error("Invalid block header cache value");
        }

        const parsedHeader = JSON.parse(entry.value);
        if (
          parsedHeader == null ||
          typeof parsedHeader !== "object" ||
          Array.isArray(parsedHeader)
        ) {
          throw new Error("Invalid block header cache value");
        }
      }

      headerListParsed[key] = entry == null ? null : entry.value;
    }
  } catch (parseError) {
    await clearCachedHeaders();
    headerListParsed = {};
  }

  dispatch(setBlockHeaders(headerListParsed));
};

//Add header to cache and store, check if store is bigger, if yes,
//set store to mirror cache
export const saveBlockHeader = async (header, height, coinID, store) => {
  const numHeaders = Object.keys(store.getState().headers.headers).length;
  await setCachedHeader(header, height, coinID);

  if (numHeaders < BLOCK_HEADER_STORE_CAP) {
    await loadCachedHeaders(store.dispatch);
  }
};
