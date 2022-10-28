import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getSignatureInfo = (coinObj, iAddrOrIdentity, base64Sig) => {
  return VrpcProvider.getVerusIdInterface(coinObj.id).getSignatureInfo(
    iAddrOrIdentity,
    base64Sig
  );
}