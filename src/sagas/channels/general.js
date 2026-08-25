import { all, takeEvery, put, select } from "redux-saga/effects";
import {
  INIT_GENERAL_CHANNEL_FINISH,
  INIT_GENERAL_CHANNEL_START,
} from "../../utils/constants/storeType";
import {sessionActionIsCurrent} from '../../actions/actions/updates/sessionRequests';

export default function * generalSaga() {
  yield all([
    takeEvery(INIT_GENERAL_CHANNEL_START, handleFinishGeneralInit),
  ]);
}

function * handleFinishGeneralInit(action) {
  if (!sessionActionIsCurrent(yield select(), action)) return;
  yield put({type: INIT_GENERAL_CHANNEL_FINISH, payload: action.payload, meta: action.meta})
}
