import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const verifyMessage = (systemId, iAddrOrIdentity, base64Sig, message) => {
  return VrpcProvider.getVerusIdInterface(systemId).verifyMessage(
    iAddrOrIdentity,
    base64Sig,
    message,
  );
}