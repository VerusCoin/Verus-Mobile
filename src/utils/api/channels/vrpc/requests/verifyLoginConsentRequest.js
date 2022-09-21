import { LoginConsentRequest } from "verus-typescript-primitives";
import { verifyMessage } from "./verifyMessage";

export const verifyLoginConsentRequest = (coinObj, request) => {
  const loginConsentRequest = new LoginConsentRequest(request);

  if (coinObj.id !== loginConsentRequest.chain_id)
    throw new Error(
      'Login consent request chain ID does not match selected chain ID',
    );

  return verifyMessage(
    coinObj,
    loginConsentRequest.signing_id,
    loginConsentRequest.signature.signature,
    loginConsentRequest.getSignedData(),
  );
};