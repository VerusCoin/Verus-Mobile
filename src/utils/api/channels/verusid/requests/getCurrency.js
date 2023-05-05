import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getCurrency = (coinObj, iAddressOrName) => {
  return VrpcProvider.getEndpoint(coinObj.id).getCurrency(iAddressOrName);
}