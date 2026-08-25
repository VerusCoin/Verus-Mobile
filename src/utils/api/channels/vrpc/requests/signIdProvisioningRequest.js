import { primitives, VerusIdInterface } from "verusid-ts-client"
import { requestPrivKey } from "../../../../auth/authBox";
import { VRPC } from "../../../../constants/intervalConstants";

export const signIdProvisioningRequest = async (
  coinObj,
  rawRequest,
  requestContext = null,
) => {
  const request = new primitives.LoginConsentProvisioningRequest(rawRequest)

  return await VerusIdInterface.signVerusIdProvisioningRequest(
    request,
    await requestPrivKey(coinObj.id, VRPC, requestContext),
  );
};
