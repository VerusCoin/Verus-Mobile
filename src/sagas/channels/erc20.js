import {all, takeEvery, takeLatest, call, put, select} from 'redux-saga/effects';
import {
  INIT_ERC20_CHANNEL_START,
  CLOSE_ERC20_CHANNEL,
  SIGN_OUT_COMPLETE,
  INIT_ERC20_CHANNEL_FINISH,
} from '../../utils/constants/storeType';
import {getWeb3ProviderForNetwork, deleteAllWeb3Contracts} from '../../utils/web3/provider';
import {signOutCompletionWasAccepted} from '../../actions/actions/updates/sessionRequests';
import {awaitSagaResourceSettlements, clearSagaResources} from './resourceOwnership';
import {createResourceLifecycle} from './resourceLifecycle';

const lifecycle = createResourceLifecycle({
  channel: 'erc20',
  resourceKeyForAction: action =>
    `erc20:${action.payload.network}:${action.payload.contractAddress.toLowerCase()}`,
  *initializeResource(action, shouldInitialize) {
    const provider = getWeb3ProviderForNetwork(action.payload.network);
    if (shouldInitialize) {
      yield call([provider, provider.initContract], action.payload.contractAddress);
    }
  },
  *deleteResource(action) {
    const provider = getWeb3ProviderForNetwork(action.payload.network);
    yield call([provider, provider.deleteContract], action.payload.contractAddress);
  },
  finishInitialization: handleFinishErc20Init,
  closeErrorMessage: 'Account changed while the ERC20 wallet was being closed.',
});

export function* handleErc20ChannelInit(action) {
  yield* lifecycle.initialize(action);
}

function* handleErc20ChannelInitSafely(action) {
  yield* lifecycle.initializeSafely(action);
}

export function* handleErc20ChannelClose(action) {
  yield* lifecycle.close(action);
}

export default function * erc20Saga() {
  yield all([
    takeEvery(INIT_ERC20_CHANNEL_START, handleErc20ChannelInitSafely),
    takeEvery(CLOSE_ERC20_CHANNEL, handleErc20ChannelClose),
    takeLatest(SIGN_OUT_COMPLETE, handleSignOutSafely)
  ]);
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
