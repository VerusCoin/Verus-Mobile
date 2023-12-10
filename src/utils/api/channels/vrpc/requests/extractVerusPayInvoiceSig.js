import { primitives } from "verusid-ts-client"
import { getSignatureInfo } from "./getSignatureInfo";

export const extractVerusPayInvoiceSig = (coinObj, inv) => {
  const invoice = primitives.VerusPayInvoice.fromJson(inv);

  return getSignatureInfo(
    coinObj.system_id,
    invoice.signing_id,
    invoice.signature.signature
  );
};