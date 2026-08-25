import { all, takeEvery, takeLatest, call, put, select } from "redux-saga/effects";
import {
  INIT_ERC20_CHANNEL_START,
  CLOSE_ERC20_CHANNEL,
  SIGN_OUT_COMPLETE,
  INIT_ERC20_CHANNEL_FINISH,
} from "../../utils/constants/storeType";
import { getWeb3ProviderForNetwork, deleteAllWeb3Contracts } from '../../utils/web3/provider';
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

const contractResourceKey = action =>
  `erc20:${action.payload.network}:${action.payload.contractAddress.toLowerCase()}`;

function* releaseContract(action, resourceKey, owner, releaseHistorical = false) {
  const released = releaseHistorical
    ? releaseSagaResourcesForAction(resourceKey, action, 'erc20')
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
    yield call(deleteContractResource, action, resourceKey, released.deletion);
  } else if (released.deletion != null) {
    yield call(() => released.deletion.promise);
  } else {
    yield call(awaitSagaResourceRelease, resourceKey);
  }

  return {status: 'closed', resourceKey};
}

function* deleteContractResource(
  action,
  resourceKey,
  deletion,
  propagateFailure = true,
) {
  try {
    const provider = getWeb3ProviderForNetwork(action.payload.network);
    yield call(
      [provider, provider.deleteContract],
      action.payload.contractAddress,
    );
    completeSagaResourceDeletion(resourceKey, deletion);
  } catch (error) {
    failSagaResourceDeletion(resourceKey, deletion, error);
    if (propagateFailure) throw error;
    console.warn(error);
  }
}

export default function * erc20Saga() {
  yield all([
    takeEvery(INIT_ERC20_CHANNEL_START, handleErc20ChannelInitSafely),
    takeEvery(CLOSE_ERC20_CHANNEL, handleErc20ChannelClose),
    takeLatest(SIGN_OUT_COMPLETE, handleSignOutSafely)
  ]);
}

function* handleErc20ChannelInitSafely(action) {
  try {
    yield call(handleErc20ChannelInit, action);
  } catch (error) {
    console.warn(error);
  }
}

export function * handleErc20ChannelInit(action) {
  if (!sessionActionIsCurrent(yield select(), action)) return;
  const resourceKey = contractResourceKey(action);
  const owner = getSagaResourceOwnerKey(action, 'erc20');
  let ownership = acquireSagaResource(resourceKey, owner);

  try {
    if (ownership.deletion != null) {
      yield call(() => ownership.deletion.promise);
      ownership = acquireSagaResource(resourceKey, owner);
    }
    const provider = getWeb3ProviderForNetwork(action.payload.network);
    if (ownership.shouldInitialize) {
      yield call([provider, provider.initContract], action.payload.contractAddress);
      const completion = completeSagaResourceInitialization(
        resourceKey,
        ownership.initialization,
      );
      if (completion.shouldDelete) {
        yield call(
          deleteContractResource,
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
    yield call(releaseContract, action, resourceKey, owner);
    throw error;
  }

  if (!hasSagaResourceOwner(resourceKey, owner)) return;

  if (!sessionActionIsCurrent(yield select(), action)) {
    yield call(releaseContract, action, resourceKey, owner);
    return;
  }
  yield call(handleFinishErc20Init, action)
}

export function * handleErc20ChannelClose(action) {
  const closeRequestId = action?.meta?.channelCloseRequestId;

  try {
    const state = yield select();
    if (
      closeRequestId != null &&
      !channelCloseRequestIsPending(closeRequestId)
    ) return;
    if (!sessionActionMayTeardown(state, action)) {
      const error = new Error(
        'Account changed while the ERC20 wallet was being closed.',
      );
      error.code = 'SESSION_CHANGED';
      throw error;
    }
    const result = yield call(
      releaseContract,
      action,
      contractResourceKey(action),
      getSagaResourceOwnerKey(action, 'erc20'),
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
  yield call(awaitSagaResourceSettlements, 'erc20:');
  if (!signOutCompletionWasAccepted(yield select(), action)) return;
  clearSagaResources('erc20:');
  yield call(deleteAllWeb3Contracts)
}

function* handleSignOutSafely(action) {
  try {
    yield call(handleSignOut, action);
  } catch (error) {
    console.warn(error);
  }
}

function * handleFinishErc20Init(action) {
  yield put({type: INIT_ERC20_CHANNEL_FINISH, payload: action.payload, meta: action.meta})
}
