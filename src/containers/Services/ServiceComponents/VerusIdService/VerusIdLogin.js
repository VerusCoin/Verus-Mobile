import { primitives } from 'verusid-ts-client'
import { SET_DEEPLINK_DATA } from "../../../../utils/constants/storeType";

export const processVerusId = async (props, loginConsentRequest, extraParams = null) => {

    const req = new primitives.LoginConsentRequest();
    req.fromBuffer(Buffer.from(loginConsentRequest, 'base64'));

    props.dispatch({
      type: SET_DEEPLINK_DATA,
      payload: {
        id: primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid,
        data: req.toJson(),
        fromService: extraParams ? extraParams.fromService : null,
        extraParams: extraParams
      },
    });
    props.navigation.navigate('DeepLink');
  }
