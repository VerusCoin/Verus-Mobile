import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const sendRawTransaction = (coinObj, hexstring, allowHighFees) => {
  return VrpcProvider.getEndpoint(coinObj.id).sendRawTransaction(hexstring, allowHighFees);
}