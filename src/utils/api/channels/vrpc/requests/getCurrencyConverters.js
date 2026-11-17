import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getCurrencyConverters = async (systemId, paramObj) => {
  const endpoint = VrpcProvider.getEndpoint(systemId);

  return endpoint.getCurrencyConverters([typeof paramObj === 'string' ? paramObj : JSON.stringify(paramObj)])
}