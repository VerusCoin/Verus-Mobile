import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getAddressDeltas = (systemId, addresses, includeFriendlyNames, verbosity) => {
  return VrpcProvider.getEndpoint(systemId).getAddressDeltas({
    addresses,
    friendlynames: includeFriendlyNames,
    verbosity
  });
}