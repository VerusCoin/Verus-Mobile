import { all, takeEvery, takeLatest, call, put, select } from "redux-saga/effects";
import {
  INIT_VRPC_CHANNEL_START,
  CLOSE_VRPC_CHANNEL,
  SIGN_OUT_COMPLETE,
  INIT_VRPC_CHANNEL_FINISH,
  SET_WATCHED_VRPC_ADDRESSES,
} from "../../utils/constants/storeType";
import VrpcProvider from '../../utils/vrpc/vrpcInterface';
import {
  sessionActionIsCurrent,
  sessionActionMayTeardown,
  signOutCompletionWasAccepted,
} from '../../actions/actions/updates/sessionRequests';
import {
  acquireSagaResource,
  awaitSagaResourceRelease,
  awaitSagaResourceSettlements,
  clearSagaResources,
  completeSagaResourceDeletion,
  completeSagaResourceInitialization,
  expireSagaResourceDeletion,
  failSagaResourceDeletion,
  failSagaResourceInitialization,
  getSagaResourceOwnerKey,
  hasSagaResourceOwner,
  releaseSagaResource,
  releaseSagaResourcesForAction,
} from './resourceOwnership';
import {
  channelCloseRequestIsPending,
  rejectChannelCloseRequest,
  resolveChannelCloseRequest,
  setChannelCloseRequestTimeoutHandler,
} from '../../utils/channelCloseRequests';

const endpointResourceKey = action =>
  `vrpc:${action.payload.systemId}:${action.payload.endpointAddress}`;

function* releaseEndpoint(action, resourceKey, owner, releaseHistorical = false) {
  const released = releaseHistorical
    ? releaseSagaResourcesForAction(resourceKey, action, 'vrpc')
    : releaseSagaResource(resourceKey, owner);
  if (!released.released) return {status: 'not_owned', resourceKey};

  setChannelCloseRequestTimeoutHandler(
    action?.meta?.channelCloseRequestId,
    error => expireSagaResourceDeletion(
      resourceKey,
      released.deletion,
      error,
    ),
  );

  if (released.shouldDelete) {
    yield call(deleteEndpointResource, action, resourceKey, released.deletion);
  } else if (released.deletion != null) {
    yield call(() => released.deletion.promise);
  } else {
    yield call(awaitSagaResourceRelease, resourceKey);
  }

  return {status: 'closed', resourceKey};
}

function* deleteEndpointResource(
  action,
  resourceKey,
  deletion,
  propagateFailure = true,
) {
  try {
    yield call(
      VrpcProvider.deleteEndpoint,
      action.payload.systemId,
      action.payload.endpointAddress,
    );
    completeSagaResourceDeletion(resourceKey, deletion);
  } catch (error) {
    failSagaResourceDeletion(resourceKey, deletion, error);
    if (propagateFailure) throw error;
    console.warn(error);
  }
}

export default function * vrpcSaga() {
  yield all([
    takeEvery(INIT_VRPC_CHANNEL_START, handleVrpcChannelInitSafely),
    takeEvery(CLOSE_VRPC_CHANNEL, handleVrpcChannelClose),
    takeLatest(SIGN_OUT_COMPLETE, handleSignOutSafely)
  ]);
}

function* handleVrpcChannelInitSafely(action) {
  try {
    yield call(handleVrpcChannelInit, action);
  } catch (error) {
    console.warn(error);
  }
}

function * handleVrpcChannelInit(action) {
  if (!sessionActionIsCurrent(yield select(), action)) return;
  const resourceKey = endpointResourceKey(action);
  const owner = getSagaResourceOwnerKey(action, 'vrpc');
  let ownership = acquireSagaResource(resourceKey, owner);

  try {
    if (ownership.deletion != null) {
      yield call(() => ownership.deletion.promise);
      ownership = acquireSagaResource(resourceKey, owner);
    }
    if (ownership.shouldInitialize) {
      yield call(
        VrpcProvider.initEndpoint,
        action.payload.systemId,
        action.payload.endpointAddress,
      );
      const completion = completeSagaResourceInitialization(
        resourceKey,
        ownership.initialization,
      );
      if (completion.shouldDelete) {
        yield call(
          deleteEndpointResource,
          action,
          resourceKey,
          completion.deletion,
          false,
        );
        return;
      }
    } else if (!ownership.initialized) {
      yield call(() => ownership.initialization.promise);
    }
  } catch (error) {
    if (ownership.shouldInitialize) {
      failSagaResourceInitialization(
        resourceKey,
        ownership.initialization,
        error,
      );
    }
    yield call(releaseEndpoint, action, resourceKey, owner);
    throw error;
  }

  if (!hasSagaResourceOwner(resourceKey, owner)) return;

  if (!sessionActionIsCurrent(yield select(), action)) {
    yield call(releaseEndpoint, action, resourceKey, owner);
    return;
  }
  yield call(handleFinishVrpcInit, action)
}

export function* handleVrpcChannelClose(action) {
  const closeRequestId = action?.meta?.channelCloseRequestId;

  try {
    const state = yield select();
    if (
      closeRequestId != null &&
      !channelCloseRequestIsPending(closeRequestId)
    ) return;
    if (!sessionActionMayTeardown(state, action)) {
      const error = new Error(
        'Account changed while the VRPC wallet was being closed.',
      );
      error.code = 'SESSION_CHANGED';
      throw error;
    }
    const result = yield call(
      releaseEndpoint,
      action,
      endpointResourceKey(action),
      getSagaResourceOwnerKey(action, 'vrpc'),
      true,
    );
    resolveChannelCloseRequest(closeRequestId, result);
  } catch (error) {
    if (!rejectChannelCloseRequest(closeRequestId, error)) {
      console.warn(error);
    }
  }
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
