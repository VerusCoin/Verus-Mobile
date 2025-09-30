import { primitives } from "verusid-ts-client"
import { getSignatureInfo } from "./getSignatureInfo";

/**
 * Extracts a signature from a signed VerusPay invoice
 * @param {any} coinObj A coin object
 * @param {primitives.VerusPayInvoice} inv A VerusPay invoice instance
 */
export const extractVerusPayInvoiceSig = (coinObj, inv) => {
  if (!(inv instanceof primitives.VerusPayInvoice)) {
    throw new Error("Expected VerusPayInvoice, got " + inv)
  }

  return getSignatureInfo(
    coinObj.system_id,
    inv.signing_id,
    inv.signature.signature
  );
};