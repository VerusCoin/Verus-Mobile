import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getBlock = (coinObj, hashOrHeight, verbosity) => {
  return VrpcProvider.getEndpoint(coinObj.id).getBlock(hashOrHeight, verbosity);
}