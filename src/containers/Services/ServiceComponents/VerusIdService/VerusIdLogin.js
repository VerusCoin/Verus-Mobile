import { primitives } from 'verusid-ts-client'
import { SET_DEEPLINK_DATA } from "../../../../utils/constants/storeType"
import {
  getPendingDeeplinkPassthrough,
  savePendingDeeplinkRequest,
} from '../../../../utils/deeplink/pendingDeeplinkStorage';

export const processVerusId = async (
  props,
  requestPayload,
  fromService = null,
  fqnToAutoLink = null,
  requestType = 'loginconsent',
  notificationUid = null,
  guard = null,
) => {
  // Optional caller-supplied guard. When provided it is checked immediately
  // before every dispatch and navigation so a stale resumption cannot write
  // into a newer wallet session or override a newer operation. Callers that
  // pass no guard keep the original unguarded behavior.
  const isCurrent = () => (typeof guard === 'function' ? guard() !== false : true);

  if (!isCurrent()) return null;

  if (requestType === 'generic') {
    let savedPendingRequest = null;

    try {
      savedPendingRequest = await savePendingDeeplinkRequest({
        requestBufferString: requestPayload,
        fromService,
        fqnToAutoLink,
        requestType,
      });
    } catch (e) {
      console.warn('Unable to save pending deeplink', e?.message ?? e);
    }

    // The storage await can straddle a session change or a newer operation.
    if (!isCurrent()) return null;

    const passthrough = {
      fqnToAutoLink,
      notificationUid,
      ...(getPendingDeeplinkPassthrough(savedPendingRequest) || {}),
    };

    if (!isCurrent()) return null;
    props.dispatch({
      type: SET_DEEPLINK_DATA,
      payload: {
        id: primitives.GENERIC_REQUEST_DEEPLINK_VDXF_KEY.vdxfid,
        data: requestPayload,
        fromService: fromService,
        passthrough,
      },
    });
    if (!isCurrent()) return null;
    props.navigation.navigate('DeepLink', {screen: 'VerifyDeepLink'});
    return;
  }

  const req = new primitives.LoginConsentRequest();
  req.fromBuffer(Buffer.from(requestPayload, 'base64'));

  if (!isCurrent()) return null;
  props.dispatch({
    type: SET_DEEPLINK_DATA,
    payload: {
      id: primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid,
      data: req.toJson(),
      fromService: fromService,
      passthrough: { fqnToAutoLink, notificationUid }
    },
  });
    if (!isCurrent()) return null;
  props.navigation.navigate('DeepLink', {screen: 'VerifyDeepLink'});
}
