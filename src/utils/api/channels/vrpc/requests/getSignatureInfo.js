import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getSignatureInfo = (systemId, iAddrOrIdentity, base64Sig) => {
  return VrpcProvider.getVerusIdInterface(systemId).getSignatureInfo(
    iAddrOrIdentity,
    base64Sig
  );
}