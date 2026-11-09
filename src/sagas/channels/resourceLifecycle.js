import {call, select} from 'redux-saga/effects';
import {
  sessionActionIsCurrent,
  sessionActionMayTeardown,
} from '../../actions/actions/updates/sessionRequests';
import {
  acquireSagaResource,
  awaitSagaResourceRelease,
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

export const createResourceLifecycle = ({
  channel,
  resourceKeyForAction,
  initializeResource,
  deleteResource,
  finishInitialization,
  closeErrorMessage,
}) => {
  function* release(action, resourceKey, owner, releaseHistorical = false) {
    const released = releaseHistorical
      ? releaseSagaResourcesForAction(resourceKey, action, channel)
      : releaseSagaResource(resourceKey, owner);
    if (!released.released) return {status: 'not_owned', resourceKey};

    setChannelCloseRequestTimeoutHandler(
      action?.meta?.channelCloseRequestId,
      error => expireSagaResourceDeletion(resourceKey, released.deletion, error),
    );

    if (released.shouldDelete) {
      yield call(remove, action, resourceKey, released.deletion);
    } else if (released.deletion != null) {
      yield call(() => released.deletion.promise);
    } else {
      yield call(awaitSagaResourceRelease, resourceKey);
    }

    return {status: 'closed', resourceKey};
  }

  function* remove(action, resourceKey, deletion, propagateFailure = true) {
    try {
      yield* deleteResource(action);
      completeSagaResourceDeletion(resourceKey, deletion);
    } catch (error) {
      failSagaResourceDeletion(resourceKey, deletion, error);
      if (propagateFailure) throw error;
      console.warn(error);
    }
  }

  function* initialize(action) {
    if (!sessionActionIsCurrent(yield select(), action)) return;
    const resourceKey = resourceKeyForAction(action);
    const owner = getSagaResourceOwnerKey(action, channel);
    let ownership = acquireSagaResource(resourceKey, owner);

    try {
      if (ownership.deletion != null) {
        yield call(() => ownership.deletion.promise);
        ownership = acquireSagaResource(resourceKey, owner);
      }
      // Run the adapter for existing owners too: ERC20 still looks up its
      // provider. Delegation retains the provider call's effect/cancellation.
      yield* initializeResource(action, ownership.shouldInitialize);
      if (ownership.shouldInitialize) {
        const completion = completeSagaResourceInitialization(
          resourceKey,
          ownership.initialization,
        );
        if (completion.shouldDelete) {
          yield call(remove, action, resourceKey, completion.deletion, false);
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
      yield call(release, action, resourceKey, owner);
      throw error;
    }

    if (!hasSagaResourceOwner(resourceKey, owner)) return;

    if (!sessionActionIsCurrent(yield select(), action)) {
      yield call(release, action, resourceKey, owner);
      return;
    }
    yield call(finishInitialization, action);
  }

  function* initializeSafely(action) {
    try {
      yield call(initialize, action);
    } catch (error) {
      console.warn(error);
    }
  }

  function* close(action) {
    const closeRequestId = action?.meta?.channelCloseRequestId;

    try {
      const state = yield select();
      if (
        closeRequestId != null &&
        !channelCloseRequestIsPending(closeRequestId)
      ) return;
      if (!sessionActionMayTeardown(state, action)) {
        const error = new Error(closeErrorMessage);
        error.code = 'SESSION_CHANGED';
        throw error;
      }
      const result = yield call(
        release,
        action,
        resourceKeyForAction(action),
        getSagaResourceOwnerKey(action, channel),
        true,
      );
      resolveChannelCloseRequest(closeRequestId, result);
    } catch (error) {
      if (!rejectChannelCloseRequest(closeRequestId, error)) {
        console.warn(error);
      }
    }
  }

  return {initialize, initializeSafely, close};
};
