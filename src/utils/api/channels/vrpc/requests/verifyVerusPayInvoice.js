import { primitives } from "verusid-ts-client"
import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const verifyVerusPayInvoice = (coinObj, inv) => {
  const invoice = new primitives.VerusPayInvoice(inv);

  return VrpcProvider.getVerusIdInterface(coinObj.system_id).verifySignedVerusPayInvoice(
    invoice,
  );
};