import axios from "axios";
import { primitives } from "verusid-ts-client"
import {URL} from 'react-native-url-polyfill';
import base64url from 'base64url';
import { Linking } from "react-native";
import { openUrl } from "../linking";

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

    openUrl(urlstring)

    return null
  }
}

export const handleRedirect = (response, redirectinfo) => {
  const { vdxfkey, uri } = redirectinfo

  return handlers[vdxfkey] == null ? null : handlers[vdxfkey](uri, response);
}