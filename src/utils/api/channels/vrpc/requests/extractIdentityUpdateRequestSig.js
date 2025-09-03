import { primitives } from "verusid-ts-client"
import { getSignatureInfo } from "./getSignatureInfo";

/**
 * Extracts a signature from an identity update request
 * @param {any} coinObj A coin object
 * @param {primitives.IdentityUpdateRequest} req An identity update request instance
 */
export const extractIdentityUpdateRequestSig = (coinObj, req) => {
  if (!(req instanceof primitives.IdentityUpdateRequest)) {
    throw new Error("Expected IdentityUpdateRequest, got " + req)
  }

  return getSignatureInfo(
    coinObj.system_id,
    req.signingid.toAddress(),
    req.signature.signature
  );
};