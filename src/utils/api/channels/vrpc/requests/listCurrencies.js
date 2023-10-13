import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const listCurrencies = (systemId, systemType = "local") => {
  return VrpcProvider.getEndpoint(systemId).listCurrencies({ systemtype: systemType });
}