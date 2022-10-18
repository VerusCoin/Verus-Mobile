import axios from "axios";
import { primitives } from "verusid-ts-client"
import {URL} from 'react-native-url-polyfill';
import base64url from 'base64url';
import { Linking } from "react-native";

const handlers = {
  [primitives.LOGIN_CONSENT_WEBHOOK_VDXF_KEY.vdxfid]: async (uri, response) => {
    return await axios.post(
      uri,
      response
    );
  },
  [primitives.LOGIN_CONSENT_REDIRECT_VDXF_KEY.vdxfid]: (uri, response) => {
    const url = new URL(uri)
    const res = new primitives.LoginConsentResponse(response)
    url.searchParams.set(
      primitives.LOGIN_CONSENT_RESPONSE_VDXF_KEY.vdxfid,
      base64url(res.toBuffer())
    );

    const urlstring = url.toString()
    
    Linking.canOpenURL(urlstring).then(supported => {
      if (supported) {
        Linking.openURL(urlstring.toString());
      } else {
        throw new Error(`Failed to open ${urlstring}`)
      }
    });

    return null
  }
}

export const handleRedirect = (response, redirectinfo) => {
  const { vdxfkey, uri } = redirectinfo

  return handlers[vdxfkey] == null ? null : handlers[vdxfkey](uri, response);
}