import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const fundRawTransaction = (systemId, txHex, utxos, changeAddr, fee) => {
  return VrpcProvider.getEndpoint(systemId).fundRawTransaction(txHex, utxos, changeAddr, fee)
}