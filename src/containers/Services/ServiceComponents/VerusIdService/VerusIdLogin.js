import { primitives } from 'verusid-ts-client'
import { SET_DEEPLINK_DATA } from "../../../../utils/constants/storeType";

export const tryProcessVerusIdSignIn = (props, loginConsentRequest, redirect = null) => {

    const req = new primitives.LoginConsentRequest();
    req.fromBuffer(Buffer.from(loginConsentRequest, 'base64'));
    console.log("tryProcessVerusIdSignIn", {
        id: primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid,
        redirect: redirect,
      },)

    props.dispatch({
      type: SET_DEEPLINK_DATA,
      payload: {
        id: primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid,
        data: req.toJson(),
        redirect: redirect ,
      },
    });
    props.navigation.navigate('DeepLink');
  }
