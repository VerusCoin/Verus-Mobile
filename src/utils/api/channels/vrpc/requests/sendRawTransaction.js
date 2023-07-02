import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const sendRawTransaction = (systemId, hexstring, allowHighFees) => {
  return VrpcProvider.getEndpoint(systemId).sendRawTransaction(hexstring, allowHighFees);
}