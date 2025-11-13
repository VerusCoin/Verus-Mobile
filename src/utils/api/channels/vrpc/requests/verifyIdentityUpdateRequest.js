import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const verifyIdentityUpdateRequest = (coinObj, request) => {
  return VrpcProvider.getVerusIdInterface(coinObj.system_id).verifyIdentityUpdateRequest(
    request,
  );
};