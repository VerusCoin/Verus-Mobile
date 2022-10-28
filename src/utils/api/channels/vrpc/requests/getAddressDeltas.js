import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getAddressDeltas = (coinObj, addresses, includeFriendlyNames) => {
  return VrpcProvider.getEndpoint(coinObj.id).getAddressDeltas({
    addresses,
    friendlynames: includeFriendlyNames,
  });
}