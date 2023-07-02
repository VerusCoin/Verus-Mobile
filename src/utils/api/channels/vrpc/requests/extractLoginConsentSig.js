import { primitives } from "verusid-ts-client"
import { getSignatureInfo } from "./getSignatureInfo";

export const extractLoginConsentSig = (coinObj, request) => {
  const loginConsentRequest = new primitives.LoginConsentRequest(request);

  return getSignatureInfo(
    coinObj.system_id,
    loginConsentRequest.signing_id,
    loginConsentRequest.signature.signature
  );
};