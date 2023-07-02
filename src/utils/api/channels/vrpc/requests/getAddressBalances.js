import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getAddressBalances = (systemId, addresses, includeFriendlyNames) => {
  return VrpcProvider.getEndpoint(systemId).getAddressBalance({
    addresses,
    friendlynames: includeFriendlyNames,
  });
}