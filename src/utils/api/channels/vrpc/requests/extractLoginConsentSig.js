import { LoginConsentRequest } from "verus-typescript-primitives";
import { getSignatureInfo } from "./getSignatureInfo";

export const extractLoginConsentSig = (coinObj, request) => {
  const loginConsentRequest = new LoginConsentRequest(request);

  return getSignatureInfo(
    coinObj,
    loginConsentRequest.signing_id,
    loginConsentRequest.signature.signature
  );
};