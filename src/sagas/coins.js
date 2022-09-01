import {all, takeEvery, put, call} from 'redux-saga/effects';
import { requestServiceStoredData } from '../utils/auth/authBox';
import { PRE_DATA, VRPC } from '../utils/constants/intervalConstants';
import { VERUSID_SERVICE_ID } from '../utils/constants/services';
import {
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

  try {
    const verusIdStoredData = yield call(
      requestServiceStoredData,
      VERUSID_SERVICE_ID,
    );
    const linkedIds =
      verusIdStoredData.linked_ids == null ? {} : verusIdStoredData.linked_ids;

    action.payload.activeCoinsForUser.map(coinObj => {
      const dynamicChannelNames = {}

      const verusIdChannels = linkedIds[coinObj.id]
        ? Object.keys(linkedIds[coinObj.id]).map(iAddr => {
            const channelId = `${VRPC}.${iAddr}`;
            dynamicChannelNames[channelId] = linkedIds[coinObj.id][iAddr];
            return channelId;
          })
        : [];

      coinStatus[coinObj.id] = PRE_DATA;
      allSubWallets[coinObj.id] = getDefaultSubWallets(
        coinObj,
        verusIdChannels,
        linkedIds[coinObj.id] ? dynamicChannelNames : {},
      );
    });
  } catch (e) {
    console.warn(e);
  }

  yield put({
    type: SET_USER_COINS_COMPLETE,
    payload: {
      allSubWallets,
      status: coinStatus,
      activeCoinsForUser: action.payload.activeCoinsForUser,
    },
  });
}
