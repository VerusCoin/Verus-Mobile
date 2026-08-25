import { all, takeEvery, put, select } from "redux-saga/effects";
import {
  INIT_WYRE_COIN_CHANNEL_START,
  INIT_WYRE_COIN_CHANNEL_FINISH,
} from "../../utils/constants/storeType";
import {sessionActionIsCurrent} from '../../actions/actions/updates/sessionRequests';

export default function * wyreCoinSaga() {
  yield all([
    takeEvery(INIT_WYRE_COIN_CHANNEL_START, handleFinishWyreCoinInit),
  ]);
}

function * handleFinishWyreCoinInit(action) {
  if (!sessionActionIsCurrent(yield select(), action)) return;
  yield put({type: INIT_WYRE_COIN_CHANNEL_FINISH, payload: action.payload, meta: action.meta})
}
