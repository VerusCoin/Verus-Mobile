import { all, takeEvery, put, select } from "redux-saga/effects";
import {
  INIT_DLIGHT_CHANNEL_START,
  INIT_DLIGHT_CHANNEL_FINISH,
} from "../../utils/constants/storeType";
import {sessionActionIsCurrent} from '../../actions/actions/updates/sessionRequests';

export default function * dlightSaga() {
  yield all([
    takeEvery(INIT_DLIGHT_CHANNEL_START, handleFinishDlightInit),
  ]);
}

function * handleFinishDlightInit(action) {
  if (!sessionActionIsCurrent(yield select(), action)) return;
  yield put({type: INIT_DLIGHT_CHANNEL_FINISH, payload: action.payload, meta: action.meta})
}
