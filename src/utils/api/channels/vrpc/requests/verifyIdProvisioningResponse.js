import { primitives } from "verusid-ts-client"
import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const verifyIdProvisioningResponse = (coinObj, response) => {
  const provisioningResponse = new primitives.LoginConsentProvisioningResponse(response);

  return VrpcProvider.getVerusIdInterface(coinObj.system_id).verifyVerusIdProvisioningResponse(
    provisioningResponse,
  );
};