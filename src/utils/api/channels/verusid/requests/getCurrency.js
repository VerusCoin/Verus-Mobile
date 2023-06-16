import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getCurrency = (systemId, iAddressOrName) => {
  return VrpcProvider.getEndpoint(systemId).getCurrency(iAddressOrName);
}