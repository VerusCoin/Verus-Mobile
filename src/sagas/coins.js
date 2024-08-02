import {all, takeEvery, put, call} from 'redux-saga/effects';
import store from '../store';
import { requestServiceStoredData } from '../utils/auth/authBox';
import { IS_PBAAS, PRE_DATA, VRPC } from '../utils/constants/intervalConstants';
import { VERUSID_SERVICE_ID } from '../utils/constants/services';
import {
  LOG_NEW_CHANNELS,
  SET_USER_COINS,
  SET_USER_COINS_COMPLETE,
} from '../utils/constants/storeType';
import { getDefaultSubWallets } from '../utils/defaultSubWallets';
import { getVerusIdCurrency } from '../utils/CoinData/CoinData';
import { IS_PBAAS_CHAIN } from '../utils/constants/currencies';
import { coinsList } from '../utils/CoinData/CoinsList';

export default function* setUserCoinsSaga() {
  yield all([takeEvery(SET_USER_COINS, handleFinishSetUserCoins)]);
}

function* handleFinishSetUserCoins(action) {
  let allSubWallets = {};
  let coinStatus = {};
  let allNewChannels = []

  try {
    const verusIdStoredData = yield call(
      requestServiceStoredData,
      VERUSID_SERVICE_ID,
    );
    const linkedIds =
      verusIdStoredData.linked_ids == null ? {} : verusIdStoredData.linked_ids;
    const state = store.getState()
    const { watchedAddresses } = state.channelStore_vrpc

    action.payload.activeCoinsForUser.map(coinObj => {
      const dynamicChannelNames = {};
      const verusIdCurrency = getVerusIdCurrency(coinObj);
      
      function setVrpcChannels(addresses, isVerusId) {
        const allSeenSystems = [coinObj.testnet ? coinsList.VRSCTEST.currency_id : coinsList.VRSC.currency_id];
        
        if (coinObj.tags.includes(IS_PBAAS)) {
          for (const coin of action.payload.activeCoinsForUser) {
            if (coin.tags.includes(IS_PBAAS) && 
                !allSeenSystems.includes(coin.system_id) &&
                coin.system_options != null && 
                (coin.system_options & IS_PBAAS_CHAIN) === IS_PBAAS_CHAIN &&
                !!(coin.testnet) === !!(coinObj.testnet)) {
                  allSeenSystems.push(coin.system_id);
            }
          }
        }
  
        return addresses.map((addr, index) => {
          return allSeenSystems.map(system => {
            const channelId = `${VRPC}.${addr}.${system}`;
            dynamicChannelNames[channelId] = isVerusId ? 
              linkedIds[verusIdCurrency][addr] : (addr.substring(0, 5) + "..." + addr.substring(addr.length - 5))
      
            return channelId;
          })
        }).flat()
      }

      const verusIdChannels = linkedIds[verusIdCurrency]
        ? setVrpcChannels(Object.keys(linkedIds[verusIdCurrency]), true)
        : [];
      
      const vrpcChannels = watchedAddresses[coinObj.id]
        ? setVrpcChannels(Object.keys(watchedAddresses[coinObj.id]), false)
        : [];
      
      allNewChannels = [...(new Set([...verusIdChannels, ...vrpcChannels]))];

      coinStatus[coinObj.id] = PRE_DATA;
      allSubWallets[coinObj.id] = getDefaultSubWallets(
        coinObj,
        [...vrpcChannels, ...verusIdChannels],
        dynamicChannelNames
      );
    });
  } catch (e) {
    console.error(e);
  }

  yield put({
    type: SET_USER_COINS_COMPLETE,
    payload: {
      allSubWallets,
      status: coinStatus,
      activeCoinsForUser: action.payload.activeCoinsForUser,
    },
  });
  yield put({
    type: LOG_NEW_CHANNELS,
    payload: {
      channels: allNewChannels
    },
  });
}
