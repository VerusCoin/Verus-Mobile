import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getAddressMempool = (systemId, addresses, includeFriendlyNames, verbosity) => {
  return VrpcProvider.getEndpoint(systemId).getAddressMempool({
    addresses,
    friendlynames: includeFriendlyNames,
    verbosity
  });
}