import { all, takeLatest, put } from "redux-saga/effects";
import {
  INIT_GENERAL_CHANNEL_FINISH,
  INIT_GENERAL_CHANNEL_START,
} from "../../utils/constants/storeType";

export default function * generalSaga() {
  yield all([
    takeLatest(INIT_GENERAL_CHANNEL_START, handleFinishGeneralInit),
  ]);
}

function * handleFinishGeneralInit(action) {
  yield put({type: INIT_GENERAL_CHANNEL_FINISH, payload: action.payload})
}