import { all, takeEvery, takeLatest, call, put } from "redux-saga/effects";
import {
  INIT_ERC20_CHANNEL_START,
  CLOSE_ERC20_CHANNEL,
  SIGN_OUT,
  INIT_ERC20_CHANNEL_FINISH,
} from "../../utils/constants/storeType";
import Web3Provider from '../../utils/web3/provider';

export default function * erc20Saga() {
  yield all([
    takeEvery(INIT_ERC20_CHANNEL_START, handleErc20ChannelInit),
    takeEvery(CLOSE_ERC20_CHANNEL, handleErc20ChannelClose),
    takeLatest(SIGN_OUT, handleSignOut)
  ]);
}

function * handleErc20ChannelInit(action) {
  yield call(Web3Provider.initContract, action.payload.contractAddress)
  yield call(handleFinishErc20Init, action)
}

function * handleErc20ChannelClose(action) {
  Web3Provider.deleteContract(action.payload.contractAddress)
}

function * handleSignOut() {
  Web3Provider.deleteAllContracts()
}

function * handleFinishErc20Init(action) {
  yield put({type: INIT_ERC20_CHANNEL_FINISH, payload: action.payload})
}