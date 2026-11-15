import {all, takeEvery, takeLatest, call, put, select} from 'redux-saga/effects';
import {
  INIT_VRPC_CHANNEL_START,
  CLOSE_VRPC_CHANNEL,
  SIGN_OUT_COMPLETE,
  INIT_VRPC_CHANNEL_FINISH,
  SET_WATCHED_VRPC_ADDRESSES,
} from '../../utils/constants/storeType';
import VrpcProvider from '../../utils/vrpc/vrpcInterface';
import {signOutCompletionWasAccepted} from '../../actions/actions/updates/sessionRequests';
import {awaitSagaResourceSettlements, clearSagaResources} from './resourceOwnership';
import {createEndpointLifecycle} from './endpointLifecycle';

const lifecycle = createEndpointLifecycle(
  () => VrpcProvider,
  'vrpc',
  'Account changed while the VRPC wallet was being closed.',
  handleFinishVrpcInit,
);

function* handleVrpcChannelInitSafely(action) {
  yield* lifecycle.initializeSafely(action);
}

export function* handleVrpcChannelClose(action) {
  yield* lifecycle.close(action);
}

export default function * vrpcSaga() {
  yield all([
    takeEvery(INIT_VRPC_CHANNEL_START, handleVrpcChannelInitSafely),
    takeEvery(CLOSE_VRPC_CHANNEL, handleVrpcChannelClose),
    takeLatest(SIGN_OUT_COMPLETE, handleSignOutSafely)
  ]);
}

function * handleSignOut(action) {
  if (!signOutCompletionWasAccepted(yield select(), action)) return;
  yield call(awaitSagaResourceSettlements, 'vrpc:');
  if (!signOutCompletionWasAccepted(yield select(), action)) return;
  clearSagaResources('vrpc:');
  yield call(VrpcProvider.deleteAllEndpoints);
  yield call(VrpcProvider.addDefaultEndpoints);
}

function* handleSignOutSafely(action) {
  try {
    yield call(handleSignOut, action);
  } catch (error) {
    console.warn(error);
  }
}

function * handleFinishVrpcInit(action) {
  yield put({type: SET_WATCHED_VRPC_ADDRESSES, payload: action.payload, meta: action.meta})
  yield put({type: INIT_VRPC_CHANNEL_FINISH, payload: action.payload, meta: action.meta})
}
