import { all, takeEvery, put, call, select } from "redux-saga/effects";
import { initAccountWidgets, setWidgets } from "../actions/actionCreators";
import { AUTHENTICATE_USER, SIGN_OUT, SIGN_OUT_COMPLETE, UPDATE_SESSION_KEY } from "../utils/constants/storeType";
import {
  abortAllSessionRequests,
  captureSessionScope,
  scopeSessionAction,
  sessionScopeIsCurrent,
  signOutWasAccepted,
} from "../actions/actions/updates/sessionRequests";
import {
  captureAccountTeardownContext,
  clearActiveAccountLifecycles,
} from '../actions/actions/account/dispatchers/account';

export default function * authenticationSaga() {
  yield all([
    takeEvery(SIGN_OUT, handleFinishSignOut),
    takeEvery(AUTHENTICATE_USER, handleAuthenticateUser),
    takeEvery(UPDATE_SESSION_KEY, handleSessionKeyUpdate),
  ]);
}

function * handleSessionKeyUpdate(action) {
  if (action.meta?.sessionScoped) {
    const state = yield select();
    const activeAccountHash = state.authentication.activeAccount?.accountHash;
    const updateWasAccepted =
      activeAccountHash === action.meta.accountHash &&
      (state.authentication.sessionEpoch || 0) ===
        action.meta.sessionEpoch + 1;

    if (!updateWasAccepted) return;
  }

  abortAllSessionRequests();
}

function * handleFinishSignOut(action) {
  const signedOutState = yield select();
  if (!signOutWasAccepted(signedOutState, action)) return;

  abortAllSessionRequests();
  const sessionScope = captureSessionScope(signedOutState);
  const teardownContext = captureAccountTeardownContext({
    sessionScope,
    resourceOwnerScope: {
      accountHash: action.meta?.accountHash || sessionScope.accountHash,
      sessionEpoch:
        action.meta?.sessionEpoch == null
          ? Math.max(0, sessionScope.sessionEpoch - 1)
          : action.meta.sessionEpoch,
    },
  });

  try {
    // Native teardown owns the captured account and always runs to completion,
    // even when another account authenticates while it is pending.
    yield call(clearActiveAccountLifecycles, teardownContext)
  } catch(e) {
    // A failed native close is explicit to direct callers, but signing out must
    // still scrub sensitive Redux state. The aggregate remains visible here.
    console.warn(e)
  }

  if (!sessionScopeIsCurrent(yield select(), sessionScope)) return;

  yield put(scopeSessionAction(setWidgets({}), sessionScope))
  yield put(scopeSessionAction({type: SIGN_OUT_COMPLETE}, sessionScope))
}

function * handleAuthenticateUser(action) {
  abortAllSessionRequests();
  const sessionScope = captureSessionScope(
    yield select(),
    action.activeAccount.accountHash,
  );

  let setWidgetAction;

  try {
    setWidgetAction = yield call(initAccountWidgets, action.activeAccount.accountHash)
  } catch(e) {
    console.warn(e)
  }

  if (setWidgetAction == null) setWidgetAction = setWidgets({})
  
  yield put(scopeSessionAction(setWidgetAction, sessionScope))
}
