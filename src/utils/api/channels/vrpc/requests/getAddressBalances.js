import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getAddressBalances = (coinObj, addresses, includeFriendlyNames) => {
  return VrpcProvider.getEndpoint(coinObj.id).getAddressBalance({
    addresses,
    friendlynames: includeFriendlyNames,
  });
}