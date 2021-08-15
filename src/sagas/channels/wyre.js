import { all, takeEvery, put } from "redux-saga/effects";
import {
  INIT_WYRE_COIN_CHANNEL_START,
  INIT_WYRE_COIN_CHANNEL_FINISH,
} from "../../utils/constants/storeType";

export default function * wyreCoinSaga() {
  yield all([
    takeEvery(INIT_WYRE_COIN_CHANNEL_START, handleFinishWyreCoinInit),
  ]);
}

function * handleFinishWyreCoinInit(action) {
  yield put({type: INIT_WYRE_COIN_CHANNEL_FINISH, payload: action.payload})
}