import { primitives } from 'verusid-ts-client'
import { SET_DEEPLINK_DATA } from "../../../../utils/constants/storeType"
import {
  getPendingDeeplinkPassthrough,
  savePendingDeeplinkRequest,
} from '../../../../utils/deeplink/pendingDeeplinkStorage';

export const processVerusId = async (props, requestPayload, fromService = null, fqnToAutoLink = null, requestType = 'loginconsent') => {
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

    const passthrough = {
      fqnToAutoLink,
      ...(getPendingDeeplinkPassthrough(savedPendingRequest) || {}),
    };

    props.dispatch({
      type: SET_DEEPLINK_DATA,
      payload: {
        id: primitives.GENERIC_REQUEST_DEEPLINK_VDXF_KEY.vdxfid,
        data: requestPayload,
        fromService: fromService,
        passthrough,
      },
    });
    props.navigation.navigate('DeepLink');
    return;
  }

  const req = new primitives.LoginConsentRequest();
  req.fromBuffer(Buffer.from(requestPayload, 'base64'));

  props.dispatch({
    type: SET_DEEPLINK_DATA,
    payload: {
      id: primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid,
      data: req.toJson(),
      fromService: fromService,
      passthrough: { fqnToAutoLink }
    },
  });
  props.navigation.navigate('DeepLink');
}
