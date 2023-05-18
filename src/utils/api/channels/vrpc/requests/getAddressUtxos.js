import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getAddressUtxos = (systemId, addresses, includeFriendlyNames) => {
  return VrpcProvider.getEndpoint(systemId).getAddressUtxos({
    addresses,
    friendlynames: includeFriendlyNames,
  });
}