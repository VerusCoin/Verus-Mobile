import { primitives } from "verusid-ts-client"
import { verifyLoginConsentRequest } from "./verifyLoginConsentRequest";
import VrpcProvider from "../../../../vrpc/vrpcInterface"
import { requestPrivKey } from "../../../../auth/authBox";
import { VRPC } from "../../../../constants/intervalConstants";

export const signLoginConsentResponse = async (coinObj, response) => {
  const loginResponse = new primitives.LoginConsentResponse(response);

  const verificatonCheck = await verifyLoginConsentRequest(
    coinObj,
    loginResponse.decision.request,
  );

  if (!verificatonCheck) {
    throw new Error("Could not verify included login consent request");
  }

  return VrpcProvider.getVerusIdInterface(coinObj.system_id).signLoginConsentResponse(
    loginResponse,
    await requestPrivKey(coinObj.id, VRPC)
  );
};