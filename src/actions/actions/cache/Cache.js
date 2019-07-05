import {
  clearCache
} from '../../../utils/asyncStore/asyncStore';

import {
  clearDataCache
} from '../../actionCreators';

export const clearCacheData = (dispatch) => {
  return new Promise((resolve) => {
    clearCache()
    .then((res) => {
      dispatch(clearDataCache())
      resolve()
    })
    .catch(e => {
      throw e
    })
  })
}