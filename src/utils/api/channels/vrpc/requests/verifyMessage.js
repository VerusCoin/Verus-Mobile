import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const verifyMessage = (coinObj, iAddrOrIdentity, base64Sig, message) => {
  return VrpcProvider.getVerusIdInterface(coinObj.id).verifyMessage(
    iAddrOrIdentity,
    base64Sig,
    message,
  );
}