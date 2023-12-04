import { refreshCoinIntervals } from '../../../actionDispatchers'
import {
  PRE_DATA,
  SYNCING,
  POST_SYNC,
  API_GET_INFO,
  DLIGHT_PRIVATE,
  IS_PBAAS
} from "../../../../utils/constants/intervalConstants";
import { setCoinStatus } from '../../../actionCreators'
import { getCoinObj } from '../../../../utils/CoinData/CoinData';
import {
  clearAllCoinIntervals,
  clearAllServiceIntervals,
  refreshServiceIntervals,
} from "./IntervalCreator";
import { DEFAULT_COIN_UPDATE_PARAMS } from '../../../../utils/constants/defaultUpdateParams';
import { coinsList } from '../../../../utils/CoinData/CoinsList';
import { IS_PBAAS_CHAIN } from '../../../../utils/constants/currencies';

export const activateChainLifecycle = (coinObj, activeCoinsForUser) => {
  const allSeenSystems = [coinObj.testnet ? coinsList.VRSCTEST.currency_id : coinsList.VRSC.currency_id];

  if (coinObj.tags.includes(IS_PBAAS) && activeCoinsForUser != null) {
    for (const coin of activeCoinsForUser) {
      if (coin.tags.includes(IS_PBAAS) && 
          !allSeenSystems.includes(coin.system_id) &&
          coin.system_options != null && 
          (coin.system_options & IS_PBAAS_CHAIN) === IS_PBAAS_CHAIN &&
          coin.testnet === coinObj.testnet) {
          allSeenSystems.push(coin.system_id);
      }
    }
  }

  refreshCoinIntervals(coinObj, {[API_GET_INFO]: {update_expired_oncomplete: getInfoOnComplete}}, DEFAULT_COIN_UPDATE_PARAMS, allSeenSystems)
}

export const refreshActiveChainLifecycles = (activeCoinsForUser) => {
  for (let i = 0; i < activeCoinsForUser.length; i++) {
    const coinObj = activeCoinsForUser[i];

    activateChainLifecycle(coinObj, activeCoinsForUser);
  }
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