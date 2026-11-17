import { unstable_batchedUpdates } from 'react-native';
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
  captureLifecycleIntervalIds,
  clearAllCoinIntervals,
  clearAllServiceIntervals,
  refreshServiceIntervals,
} from "./IntervalCreator";
import { DEFAULT_COIN_UPDATE_PARAMS } from '../../../../utils/constants/defaultUpdateParams';
import { coinsList } from '../../../../utils/CoinData/CoinsList';
import { IS_PBAAS_CHAIN } from '../../../../utils/constants/currencies';

const isPbaasChain = coin =>
  coin.tags.includes(IS_PBAAS) &&
  coin.system_options != null &&
  (coin.system_options & IS_PBAAS_CHAIN) === IS_PBAAS_CHAIN;

const getAllSeenSystemsForCoin = (coinObj, activeCoinsForUser) => {
  const allSeenSystems = [
    coinObj.testnet ? coinsList.VRSCTEST.currency_id : coinsList.VRSC.currency_id,
  ];

  if (coinObj.tags.includes(IS_PBAAS) && activeCoinsForUser != null) {
    for (const coin of activeCoinsForUser) {
      if (
        isPbaasChain(coin) &&
        !allSeenSystems.includes(coin.system_id) &&
        !!coin.testnet === !!coinObj.testnet
      ) {
        allSeenSystems.push(coin.system_id);
      }
    }
  }

  return allSeenSystems;
};

export const activateChainLifecycle = (coinObj, activeCoinsForUser) => {
  const allSeenSystems = getAllSeenSystemsForCoin(coinObj, activeCoinsForUser);

  refreshCoinIntervals(coinObj, {[API_GET_INFO]: {update_expired_oncomplete: getInfoOnComplete}}, DEFAULT_COIN_UPDATE_PARAMS, allSeenSystems)
}

export const refreshActiveChainLifecycles = (activeCoinsForUser) => {
  unstable_batchedUpdates(() => {
    for (let i = 0; i < activeCoinsForUser.length; i++) {
      const coinObj = activeCoinsForUser[i];

      activateChainLifecycle(coinObj, activeCoinsForUser);
    }
  });
}

// The list is the post-change list. Removed coins have already been cleared.
export const refreshLifecyclesAfterAssetChange = (changedCoin, activeCoinsForUser) => {
  const activeCoin = activeCoinsForUser.find(coin => coin.id === changedCoin.id);
  const otherCoins = activeCoinsForUser.filter(coin => coin.id !== changedCoin.id);
  const changesSeenSystems = isPbaasChain(changedCoin) && otherCoins.some(coin =>
    coin.tags.includes(IS_PBAAS) &&
    !!coin.testnet === !!changedCoin.testnet &&
    !getAllSeenSystemsForCoin(coin, otherCoins).includes(changedCoin.system_id),
  );

  if (changesSeenSystems) {
    refreshActiveChainLifecycles(activeCoinsForUser);
  } else if (activeCoin) {
    unstable_batchedUpdates(() => activateChainLifecycle(activeCoin, activeCoinsForUser));
  }
};

export const captureLifecycleTimers = state =>
  captureLifecycleIntervalIds(state);

export const clearChainLifecycle = (
  chainTicker,
  capturedIntervalData,
  sessionScope,
) => {
  clearAllCoinIntervals(chainTicker, capturedIntervalData, sessionScope)
}

export const activateServiceLifecycle = () => {  
  refreshServiceIntervals()
}

export const clearServiceIntervals = (capturedIntervalData, sessionScope) => {
  clearAllServiceIntervals(capturedIntervalData, sessionScope)
}

export const getInfoOnComplete = (state, dispatch, chainTicker) => {
  const activeCoin = getCoinObj(state.coins.activeCoinsForUser, chainTicker)
  
  if (activeCoin == null) return;

  const currentStatus = state.coins.status[chainTicker]
  const getInfoResult = state.ledger.info[DLIGHT_PRIVATE]?.[chainTicker];
  const getInfoError = state.errors[API_GET_INFO][DLIGHT_PRIVATE][chainTicker];
  const refresh = () =>
    refreshCoinIntervals(activeCoin, {
      [API_GET_INFO]: { update_expired_oncomplete: getInfoOnComplete }
    }, DEFAULT_COIN_UPDATE_PARAMS, getAllSeenSystemsForCoin(activeCoin, state.coins.activeCoinsForUser));

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
