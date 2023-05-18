import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getCurrency = (coinObj, iAddressOrName) => {
  return VrpcProvider.getEndpoint(coinObj.system_id).getCurrency(iAddressOrName);
}