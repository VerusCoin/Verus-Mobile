import { primitives } from "verusid-ts-client"
import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const verifyLoginConsentRequest = (coinObj, request) => {
  const loginConsentRequest = new primitives.LoginConsentRequest(request);

  return VrpcProvider.getVerusIdInterface(coinObj.system_id).verifyLoginConsentRequest(
    loginConsentRequest,
  );
};