import {all, takeEvery, select} from 'redux-saga/effects';
import {
  SET_BALANCES,
  SIGN_IN_USER,
  UPDATE_SESSION_KEY,
  UPDATE_ACCOUNT_TESTNET_OVERRIDES_COMPLETE,
} from '../utils/constants/storeType';
import {shouldRejectSessionAction} from '../reducers/sessionScope';
import {scheduleAssetDiscovery} from '../utils/assets/assetManagementService';

function* handleAssetUpdate(action) {
  const state = yield select();
  // UPDATE_SESSION_KEY increments the epoch in the reducer before this observer.
  if (action.type === UPDATE_SESSION_KEY) {
    if (action.meta?.sessionScoped &&
      (state.authentication.activeAccount?.accountHash !== action.meta.accountHash ||
       state.authentication.sessionEpoch !== action.meta.sessionEpoch + 1)) return;
  } else if (shouldRejectSessionAction(state, action)) return;
  scheduleAssetDiscovery();
}

export default function* assetManagementSaga() {
  yield all([takeEvery([
    SET_BALANCES,
    SIGN_IN_USER,
    UPDATE_SESSION_KEY,
    UPDATE_ACCOUNT_TESTNET_OVERRIDES_COMPLETE,
  ], handleAssetUpdate)]);
}
