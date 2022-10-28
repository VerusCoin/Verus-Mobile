import {all, takeEvery, takeLatest, call, put} from 'redux-saga/effects';
import {
  INIT_VERUSID_CHANNEL_START,
  CLOSE_VERUSID_CHANNEL,
  SIGN_OUT_COMPLETE,
  INIT_VERUSID_CHANNEL_FINISH,
  SET_WATCHED_VERUSIDS,
} from '../../utils/constants/storeType';
import VrpcProvider from '../../utils/vrpc/vrpcInterface';

export default function* verusidSaga() {
  yield all([
    takeEvery(INIT_VERUSID_CHANNEL_START, handleVerusidChannelInit),
    takeEvery(CLOSE_VERUSID_CHANNEL, handleVerusidChannelClose),
    takeLatest(SIGN_OUT_COMPLETE, handleSignOut),
  ]);
}

function* handleVerusidChannelInit(action) {
  yield call(
    VrpcProvider.initEndpoint,
    action.payload.chainTicker,
    action.payload.endpointAddress,
  );
  yield call(handleFinishVerusidInit, action);
}

function* handleVerusidChannelClose(action) {
  VrpcProvider.deleteEndpoint(
    action.payload.chainTicker,
    action.payload.endpointAddress,
  );
}

function* handleSignOut() {
  VrpcProvider.deleteAllEndpoints();
}

function* handleFinishVerusidInit(action) { 
  yield put({type: SET_WATCHED_VERUSIDS, payload: action.payload});
  yield put({type: INIT_VERUSID_CHANNEL_FINISH, payload: action.payload});
}
