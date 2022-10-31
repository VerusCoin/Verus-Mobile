import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getAddressMempool = (coinObj, addresses, includeFriendlyNames, verbosity) => {
  return VrpcProvider.getEndpoint(coinObj.id).getAddressMempool({
    addresses,
    friendlynames: includeFriendlyNames,
    verbosity
  });
}