import { refreshCoinIntervals } from '../../../actionDispatchers'
import {
  PRE_DATA,
  SYNCING,
  POST_SYNC,
  API_GET_INFO,
  DLIGHT_PRIVATE
} from "../../../../utils/constants/intervalConstants";
import { setCoinStatus } from '../../../actionCreators'
import { getCoinObj } from '../../../../utils/CoinData/CoinData';
import {
  clearAllCoinIntervals,
  clearAllServiceIntervals,
  refreshServiceIntervals,
} from "./IntervalCreator";

export const activateChainLifecycle = (coinObj) => {  
  refreshCoinIntervals(coinObj, {[API_GET_INFO]: {update_expired_oncomplete: getInfoOnComplete}})
}

export const clearChainLifecycle = (chainTicker) => {
  clearAllCoinIntervals(chainTicker)
}

export const activateServiceLifecycle = () => {  
  refreshServiceIntervals()
}

export const clearServiceIntervals = () => {
  clearAllServiceIntervals()
}

export const getInfoOnComplete = (state, dispatch, chainTicker) => {
  const activeCoin = getCoinObj(state.coins.activeCoinsForUser, chainTicker)
  
  if (activeCoin == null) return;

  const currentStatus = state.coins.status[chainTicker]
  const getInfoResult = state.ledger.info[chainTicker];
  const getInfoError = state.errors[API_GET_INFO][DLIGHT_PRIVATE][chainTicker];
  const refresh = () =>
    refreshCoinIntervals(activeCoin, {
      [API_GET_INFO]: { update_expired_oncomplete: getInfoOnComplete }
    });

  if (getInfoError && getInfoError.error) return

  if (
    typeof getInfoResult !== "object" ||
    !getInfoResult.hasOwnProperty("blocks") ||
    (getInfoResult.hasOwnProperty("longestchain") &&
      getInfoResult.longestchain === 0)
  ) {
    if (currentStatus !== PRE_DATA) {
      dispatch(setCoinStatus(chainTicker, PRE_DATA));
      refresh();
    }
  } else if (
    getInfoResult.percent != null &&
    getInfoResult.percent < 100
  ) {
    if (currentStatus !== SYNCING) {
      dispatch(setCoinStatus(chainTicker, SYNCING));
      refresh();
    }
  } else {
    if (currentStatus !== POST_SYNC) {
      dispatch(setCoinStatus(chainTicker, POST_SYNC));
      refresh();
    }
  }
};