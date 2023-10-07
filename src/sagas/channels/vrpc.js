import { all, takeEvery, takeLatest, call, put } from "redux-saga/effects";
import {
  INIT_VRPC_CHANNEL_START,
  CLOSE_VRPC_CHANNEL,
  SIGN_OUT_COMPLETE,
  INIT_VRPC_CHANNEL_FINISH,
  SET_WATCHED_VRPC_ADDRESSES,
} from "../../utils/constants/storeType";
import VrpcProvider from '../../utils/vrpc/vrpcInterface';

export default function * vrpcSaga() {
  yield all([
    takeEvery(INIT_VRPC_CHANNEL_START, handleVrpcChannelInit),
    takeEvery(CLOSE_VRPC_CHANNEL, handleVrpcChannelClose),
    takeLatest(SIGN_OUT_COMPLETE, handleSignOut)
  ]);
}

function * handleVrpcChannelInit(action) {
  yield call(VrpcProvider.initEndpoint, action.payload.systemId, action.payload.endpointAddress)
  yield call(handleFinishVrpcInit, action)
}

function* handleVrpcChannelClose(action) {
  VrpcProvider.deleteEndpoint(
    action.payload.systemId,
    action.payload.endpointAddress,
  );
}

function * handleSignOut() {
  VrpcProvider.deleteAllEndpoints();
  
  setImmediate(() => {
    VrpcProvider.addDefaultEndpoints();
  })
}

function * handleFinishVrpcInit(action) {
  yield put({type: SET_WATCHED_VRPC_ADDRESSES, payload: action.payload})
  yield put({type: INIT_VRPC_CHANNEL_FINISH, payload: action.payload})
}