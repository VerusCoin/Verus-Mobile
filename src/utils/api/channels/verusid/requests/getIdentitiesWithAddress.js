import { ApiRequest } from "verus-typescript-primitives";
import VrpcProvider from "../../../../vrpc/vrpcInterface";

const GET_IDENTITIES_WITH_ADDRESS = "getidentitieswithaddress";

// Minimal ApiRequest subclass — verusd-rpc-ts-client / verus-typescript-primitives
// don't yet export a class for getidentitieswithaddress. Mirroring the shape so
// CachedVerusdRpcInterface.request() can compute its cache key via request.prepare()
// (and so the JSON-RPC body { method: cmd, params: getParams() } is built correctly).
class GetIdentitiesWithAddressRequest extends ApiRequest {
  constructor(chain, rAddress) {
    super(chain, GET_IDENTITIES_WITH_ADDRESS);
    this.rAddress = rAddress;
  }
  getParams() {
    return [{ address: this.rAddress }];
  }
}

export const getIdentitiesWithAddress = async (systemId, rAddress) => {
  return VrpcProvider.getEndpoint(systemId).request(
    new GetIdentitiesWithAddressRequest(systemId, rAddress),
  );
};
