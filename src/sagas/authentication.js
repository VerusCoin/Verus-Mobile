import { all, takeEvery, put } from "redux-saga/effects";
import { SIGN_OUT, SIGN_OUT_COMPLETE } from "../utils/constants/storeType";

export default function * authenticationSaga() {
  yield all([
    takeEvery(SIGN_OUT, handleFinishSignOut),
  ]);
}

function * handleFinishSignOut() {
  yield put({type: SIGN_OUT_COMPLETE})
}