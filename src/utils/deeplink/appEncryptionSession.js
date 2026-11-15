import { captureSessionScope } from '../../actions/actions/updates/sessionRequests';

// Keep derived channel responses tied to the profile, network and original request.
export const getAppEncryptionSessionKey = state => JSON.stringify([
  captureSessionScope(state),
  state.authentication.signedIn,
  state.authentication.activeAccount?.testnetOverrides || {},
  state.deeplink?.id,
  state.deeplink?.data,
  state.deeplink?.requestId,
]);
