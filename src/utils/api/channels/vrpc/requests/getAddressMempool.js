import { GetAddressMempoolRequest } from "verus-typescript-primitives";
import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getAddressMempool = (systemId, addresses, includeFriendlyNames, verbosity, fresh = false) => {
  const endpoint = VrpcProvider.getEndpoint(systemId);
  const params = {
    addresses,
    friendlynames: includeFriendlyNames,
    verbosity
  };

  return fresh
    ? endpoint.request(new GetAddressMempoolRequest(systemId, params), {skipCache: true})
    : endpoint.getAddressMempool(params);
}
