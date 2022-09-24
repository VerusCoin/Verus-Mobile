import { LoginConsentRequest } from "verus-typescript-primitives";
import { verifyMessage } from "./verifyMessage";

export const verifyLoginConsentRequest = (coinObj, request) => {
  const loginConsentRequest = new LoginConsentRequest(request);

  return verifyMessage(
    coinObj,
    loginConsentRequest.signing_id,
    loginConsentRequest.signature.signature,
    loginConsentRequest.getSignedData(),
  );
};