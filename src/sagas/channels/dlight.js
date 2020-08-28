import { all, takeLatest, put } from "redux-saga/effects";
import {
  INIT_DLIGHT_CHANNEL_START,
  INIT_DLIGHT_CHANNEL_FINISH,
} from "../../utils/constants/storeType";

export default function * dlightSaga() {
  yield all([
    takeLatest(INIT_DLIGHT_CHANNEL_START, handleFinishDlightInit),
  ]);
}

function * handleFinishDlightInit(action) {
  yield put({type: INIT_DLIGHT_CHANNEL_FINISH, payload: action.payload})
}