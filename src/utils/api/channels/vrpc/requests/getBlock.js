import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getBlock = (systemId, hashOrHeight, verbosity) => {
  return VrpcProvider.getEndpoint(systemId).getBlock(String(hashOrHeight), verbosity);
}
