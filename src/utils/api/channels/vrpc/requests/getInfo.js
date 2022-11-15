import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getInfo = (coinObj) => {
  return VrpcProvider.getEndpoint(coinObj.id).getInfo();
}