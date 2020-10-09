import { all, takeEvery, put } from "redux-saga/effects";
import {
  INIT_ELECTRUM_CHANNEL_START,
  INIT_ELECTRUM_CHANNEL_FINISH,
} from "../../utils/constants/storeType";

export default function * electrumSaga() {
  yield all([
    takeEvery(INIT_ELECTRUM_CHANNEL_START, handleFinishElectrumInit),
  ]);
}

function * handleFinishElectrumInit(action) {
  yield put({type: INIT_ELECTRUM_CHANNEL_FINISH, payload: action.payload})
}