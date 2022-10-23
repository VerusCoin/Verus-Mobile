import {all, takeEvery, put, call} from 'redux-saga/effects';
import store from '../store';
import { requestServiceStoredData } from '../utils/auth/authBox';
import { PRE_DATA, VRPC } from '../utils/constants/intervalConstants';
import { VERUSID_SERVICE_ID } from '../utils/constants/services';
import {
  LOG_NEW_CHANNELS,
  SET_USER_COINS,
  SET_USER_COINS_COMPLETE,
} from '../utils/constants/storeType';
import { getDefaultSubWallets } from '../utils/defaultSubWallets';

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
      const dynamicChannelNames = {}

      const verusIdChannels = linkedIds[coinObj.id]
        ? Object.keys(linkedIds[coinObj.id]).map(iAddr => {
            const channelId = `${VRPC}.${iAddr}`;
            dynamicChannelNames[channelId] = linkedIds[coinObj.id][iAddr];
            return channelId;
          })
        : [];
      
      const vrpcChannels = watchedAddresses[coinObj.id]
        ? Object.keys(watchedAddresses[coinObj.id]).map((addr, index) => {
            const channelId = `${VRPC}.${addr}`;
            dynamicChannelNames[channelId] =
              index === 0 ? 'Main' : `Wallet ${index + 1}`;
            return channelId;
          })
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
