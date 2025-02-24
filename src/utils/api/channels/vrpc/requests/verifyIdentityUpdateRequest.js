import { primitives } from "verusid-ts-client"
import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const verifyIdentityUpdateRequest = (coinObj, req) => {
  const request = new primitives.IdentityUpdateRequest(req);

  return VrpcProvider.getVerusIdInterface(coinObj.system_id).verifyIdentityUpdateRequest(
    request,
  );
};