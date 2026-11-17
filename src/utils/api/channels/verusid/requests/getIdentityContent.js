import VrpcProvider from "../../../../vrpc/vrpcInterface"
import { validateLookupBinding } from "./lookupBinding";

export const getIdentityContent = async (systemId, iAddressOrName, heightStart, heightEnd, txProof, txProofHeight, vdxfKey) => {
  const res = await VrpcProvider.getEndpoint(systemId).getIdentityContent(
    iAddressOrName,
    heightStart,
    heightEnd,
    txProof,
    txProofHeight,
    vdxfKey
  );

  if (res.error) return res;
  else {
    try {
      // Daemons return the fully qualified name relative to their own chain
      // (for example "name.parent@" on VRSCTEST), so resolve it against the
      // system's root name, as getIdentity does.
      validateLookupBinding(
        systemId,
        iAddressOrName,
        res.result.identity.identityaddress,
        res.result.fullyqualifiedname,
        "identity",
      );
    } catch(e) {
      return {
        id: 0,
        error: {
          message: e.message,
          code: -1
        }
      }
    }

    return res;
  }
}
