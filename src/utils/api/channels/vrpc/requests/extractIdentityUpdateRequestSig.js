import { primitives } from "verusid-ts-client"
import { getSignatureInfo } from "./getSignatureInfo";

export const extractIdentityUpdateRequestSig = (coinObj, req) => {
  const request = primitives.IdentityUpdateRequest.fromJson(req);

  return getSignatureInfo(
    coinObj.system_id,
    request.signingid.toAddress(),
    request.signature.signature
  );
};