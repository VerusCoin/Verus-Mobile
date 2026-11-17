import store from '../../store';
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from '../../actions/actions/updates/sessionRequests';

// Read Redux directly at each async boundary; React may not have rendered a
// lock or account switch yet. A retry retains the originally reviewed session.
export const createRequestSessionGuard = (
  assertCurrent = () => {},
  sessionScope = captureSessionScope(store.getState()),
) => {
  return {
    sessionScope,
    assertCurrent: () => {
      assertCurrent();
      if (!sessionScopeIsCurrent(store.getState(), sessionScope)) {
        const error = new Error(
          'Wallet session changed. Open the request again to review it.',
        );
        error.code = 'SESSION_CHANGED';
        throw error;
      }
    },
  };
};
