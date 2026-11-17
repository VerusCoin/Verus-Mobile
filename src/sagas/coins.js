import {all, takeEvery, put, call, select} from 'redux-saga/effects';
import store from '../store';
import { requestServiceStoredData } from '../utils/auth/authBox';
import { IS_PBAAS, PRE_DATA, VRPC } from '../utils/constants/intervalConstants';
import { VERUSID_SERVICE_ID } from '../utils/constants/services';
import {
  LOG_NEW_CHANNELS,
  SET_USER_COINS,
  SET_USER_COINS_COMPLETE,
  SET_BALANCE_SHOW,
} from '../utils/constants/storeType';
import { getDefaultSubWallets } from '../utils/defaultSubWallets';
import { getVerusIdCurrency } from '../utils/CoinData/CoinData';
import { IS_PBAAS_CHAIN } from '../utils/constants/currencies';
import { coinsList } from '../utils/CoinData/CoinsList';
import {sessionActionIsCurrent} from '../actions/actions/updates/sessionRequests';
import {ensureIdentityColorSlots} from '../utils/subwallet/identityColorSettings';
import {convertFqnToDisplayFormat} from '../utils/fullyqualifiedname';
import {saveBalanceVisibility} from '../utils/asyncStore/balancePrivacyStorage';

export default function* setUserCoinsSaga() {
  yield all([
    takeEvery(SET_USER_COINS, handleFinishSetUserCoins),
    takeEvery(SET_BALANCE_SHOW, persistBalanceVisibility),
  ]);
}

function* persistBalanceVisibility() {
  const showBalance = yield select(state => state.coins.showBalance);
  yield call(saveBalanceVisibility, showBalance);
}

function* handleFinishSetUserCoins(action) {
  if (!sessionActionIsCurrent(yield select(), action)) return;

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
    if (!sessionActionIsCurrent(yield select(), action)) return;
    // Card colors are cosmetic. An unexpected failure here must never stop
    // the wallet from publishing its cards.
    try {
      yield call(
        ensureIdentityColorSlots,
        (yield select()).authentication.activeAccount?.accountHash,
        linkedIds,
      );
    } catch (colorError) {
      console.warn('Could not prepare identity card colors.', colorError);
    }
    if (!sessionActionIsCurrent(yield select(), action)) return;
    const state = store.getState()
    const { watchedAddresses } = state.channelStore_vrpc

    action.payload.activeCoinsForUser.map(coinObj => {
      const dynamicChannelNames = {};
      const verusIdCurrency = getVerusIdCurrency(coinObj);
      
      function setVrpcChannels(addresses) {
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
            const linkedName = linkedIds[verusIdCurrency]?.[addr];
            dynamicChannelNames[channelId] = linkedName != null
              ? convertFqnToDisplayFormat(linkedName)
              : (addr.substring(0, 5) + "..." + addr.substring(addr.length - 5));
      
            return channelId;
          })
        }).flat()
      }

      const verusIdChannels = linkedIds[verusIdCurrency]
        ? setVrpcChannels(Object.keys(linkedIds[verusIdCurrency]))
        : [];
      
      const vrpcChannels = watchedAddresses[coinObj.id]
        ? setVrpcChannels(Object.keys(watchedAddresses[coinObj.id]))
        : [];
      
      allNewChannels.push(...verusIdChannels, ...vrpcChannels);

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

  if (!sessionActionIsCurrent(yield select(), action)) return;

  yield put({
    type: SET_USER_COINS_COMPLETE,
    payload: {
      allSubWallets,
      status: coinStatus,
      activeCoinsForUser: action.payload.activeCoinsForUser,
    },
    meta: action.meta,
  });
  yield put({
    type: LOG_NEW_CHANNELS,
    payload: {
      channels: [...new Set(allNewChannels)]
    },
    meta: action.meta,
  });
}
