import { GetAddressBalanceRequest } from "verus-typescript-primitives";
import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getAddressBalances = (systemId, addresses, includeFriendlyNames, fresh = false) => {
  const endpoint = VrpcProvider.getEndpoint(systemId);
  const params = {
    addresses,
    friendlynames: includeFriendlyNames,
  };

  return fresh
    ? endpoint.request(new GetAddressBalanceRequest(systemId, params), {skipCache: true})
    : endpoint.getAddressBalance(params);
}
