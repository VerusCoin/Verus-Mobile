import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getAddressDeltas = (coinObj, addresses, includeFriendlyNames, verbosity) => {
  return VrpcProvider.getEndpoint(coinObj.id).getAddressDeltas({
    addresses,
    friendlynames: includeFriendlyNames,
    verbosity
  });
}