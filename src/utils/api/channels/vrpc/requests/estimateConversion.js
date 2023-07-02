import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const estimateConversion = (systemId, currency, convertto, amount, via, preconvert) => {
  return VrpcProvider.getEndpoint(systemId).estimateConversion({
    currency,
    convertto,
    amount,
    via,
    preconvert
  })
}