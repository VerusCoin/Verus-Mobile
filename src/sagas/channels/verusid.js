import {all, takeEvery, put} from 'redux-saga/effects';
import {
  INIT_VERUSID_CHANNEL_START,
  CLOSE_VERUSID_CHANNEL,
  INIT_VERUSID_CHANNEL_FINISH,
  SET_WATCHED_VERUSIDS,
  SET_PENDING_VERUSIDS,
} from '../../utils/constants/storeType';
import VrpcProvider from '../../utils/vrpc/vrpcInterface';
import {createEndpointLifecycle} from './endpointLifecycle';

const lifecycle = createEndpointLifecycle(
  () => VrpcProvider,
  'verusid',
  'Account changed while the VerusID wallet was being closed.',
  handleFinishVerusidInit,
);

function* handleVerusidChannelInitSafely(action) {
  yield* lifecycle.initializeSafely(action);
}

export function* handleVerusidChannelClose(action) {
  yield* lifecycle.close(action);
}

export default function* verusidSaga() {
  yield all([
    takeEvery(INIT_VERUSID_CHANNEL_START, handleVerusidChannelInitSafely),
    takeEvery(CLOSE_VERUSID_CHANNEL, handleVerusidChannelClose),
  ]);
}

function* handleFinishVerusidInit(action) { 
  yield put({type: SET_WATCHED_VERUSIDS, payload: action.payload, meta: action.meta});
  yield put({type: SET_PENDING_VERUSIDS, payload: action.payload, meta: action.meta});
  yield put({type: INIT_VERUSID_CHANNEL_FINISH, payload: action.payload, meta: action.meta});
}
