import { all, takeEvery, put } from "redux-saga/effects";
import {
  INIT_ETH_CHANNEL_START,
  INIT_ETH_CHANNEL_FINISH,
} from "../../utils/constants/storeType";

export default function * ethSaga() {
  yield all([
    takeEvery(INIT_ETH_CHANNEL_START, handleFinishEthInit),
  ]);
}

function * handleFinishEthInit(action) {
  yield put({type: INIT_ETH_CHANNEL_FINISH, payload: action.payload})
}