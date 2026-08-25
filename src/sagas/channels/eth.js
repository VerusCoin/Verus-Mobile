import { all, takeEvery, put, select } from "redux-saga/effects";
import {
  INIT_ETH_CHANNEL_START,
  INIT_ETH_CHANNEL_FINISH,
} from "../../utils/constants/storeType";
import {sessionActionIsCurrent} from '../../actions/actions/updates/sessionRequests';

export default function * ethSaga() {
  yield all([
    takeEvery(INIT_ETH_CHANNEL_START, handleFinishEthInit),
  ]);
}

function * handleFinishEthInit(action) {
  if (!sessionActionIsCurrent(yield select(), action)) return;
  yield put({type: INIT_ETH_CHANNEL_FINISH, payload: action.payload, meta: action.meta})
}
