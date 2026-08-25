import { all, takeEvery, put, select } from "redux-saga/effects";
import {
  INIT_ELECTRUM_CHANNEL_START,
  INIT_ELECTRUM_CHANNEL_FINISH,
} from "../../utils/constants/storeType";
import {sessionActionIsCurrent} from '../../actions/actions/updates/sessionRequests';

export default function * electrumSaga() {
  yield all([
    takeEvery(INIT_ELECTRUM_CHANNEL_START, handleFinishElectrumInit),
  ]);
}

function * handleFinishElectrumInit(action) {
  if (!sessionActionIsCurrent(yield select(), action)) return;
  yield put({type: INIT_ELECTRUM_CHANNEL_FINISH, payload: action.payload, meta: action.meta})
}
