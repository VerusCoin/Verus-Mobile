import { all, takeEvery, takeLatest, call, put } from "redux-saga/effects";
import {
  INIT_ERC20_CHANNEL_START,
  CLOSE_ERC20_CHANNEL,
  SIGN_OUT_COMPLETE,
  INIT_ERC20_CHANNEL_FINISH,
} from "../../utils/constants/storeType";
import { getWeb3ProviderForNetwork, deleteAllWeb3Contracts } from '../../utils/web3/provider';

export default function * erc20Saga() {
  yield all([
    takeEvery(INIT_ERC20_CHANNEL_START, handleErc20ChannelInit),
    takeEvery(CLOSE_ERC20_CHANNEL, handleErc20ChannelClose),
    takeLatest(SIGN_OUT_COMPLETE, handleSignOut)
  ]);
}

function * handleErc20ChannelInit(action) {
  yield call(getWeb3ProviderForNetwork(action.payload.network).initContract, action.payload.contractAddress)
  yield call(handleFinishErc20Init, action)
}

function * handleErc20ChannelClose(action) {
  getWeb3ProviderForNetwork(action.payload.network).deleteContract(action.payload.contractAddress)
}

function * handleSignOut() {
  deleteAllWeb3Contracts()
}

function * handleFinishErc20Init(action) {
  yield put({type: INIT_ERC20_CHANNEL_FINISH, payload: action.payload})
}