import { toIAddress } from "verus-typescript-primitives";
import VrpcProvider from "../../../../vrpc/vrpcInterface"

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
      const identityDefinition = res.result.identity;
      const identityFqn = res.result.fullyqualifiedname;
      
      const calculatedIAddr = toIAddress(identityFqn);
    
      if (
        calculatedIAddr !== identityDefinition.identityaddress
      ) {
        return {
          id: 0,
          error: {
            message: 'Unable to parse response identityaddress.',
            code: -1,
          },
        };
      }
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