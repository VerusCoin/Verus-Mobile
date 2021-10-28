import { all, takeEvery, put, call } from "redux-saga/effects";
import { resetServices } from "../actions/actionDispatchers";
import { SIGN_OUT, SIGN_OUT_COMPLETE } from "../utils/constants/storeType";

export default function * authenticationSaga() {
  yield all([
    takeEvery(SIGN_OUT, handleFinishSignOut),
  ]);
}

function * handleFinishSignOut() {
  try {
    yield call(resetServices)
  } catch(e) {
    console.warn(e)
  }
  
  yield put({type: SIGN_OUT_COMPLETE})
}