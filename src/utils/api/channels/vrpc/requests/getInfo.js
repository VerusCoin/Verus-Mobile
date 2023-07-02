import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getInfo = (systemId) => {
  return VrpcProvider.getEndpoint(systemId).getInfo();
}