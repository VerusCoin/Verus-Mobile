import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getAddressUtxos = (coinObj, addresses, includeFriendlyNames) => {
  return VrpcProvider.getEndpoint(coinObj.id).getAddressUtxos({
    addresses,
    friendlynames: includeFriendlyNames,
  });
}