import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getIdentity = (coinObj, iAddressOrName, height, txproof, txproofheight) => {
  return VrpcProvider.getEndpoint(coinObj.id).getIdentity(
    iAddressOrName,
    height,
    txproof,
    txproofheight,
  );
}