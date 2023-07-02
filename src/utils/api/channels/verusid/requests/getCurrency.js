import { toIAddress } from "verus-typescript-primitives";
import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getCurrency = async (systemId, iAddressOrName) => {
  const res = await VrpcProvider.getEndpoint(systemId).getCurrency(iAddressOrName);

  if (res.error) return res;
  else {
    const currencyDefinition = res.result;
    let currencyFqn = res.result.fullyqualifiedname;
    const currencyFqnSplit = currencyFqn.split(".");
    const lastName = currencyFqnSplit[currencyFqnSplit.length - 1];

    try {
      if (lastName === "VRSCTEST" || lastName === "VRSC") {
        const calculatedIAddr = toIAddress(currencyFqn);
  
        if (calculatedIAddr !== currencyDefinition.currencyid) {
          return {
            id: 0,
            error: {
              message: "Unable to parse response currencyid.",
              code: -1
            }
          }
        }
      } else {
        const attemptTest = toIAddress(currencyFqn + ".VRSCTEST");
        const attemptMain = toIAddress(currencyFqn + ".VRSC");
  
        if (attemptTest !== currencyDefinition.currencyid && attemptMain !== currencyDefinition.currencyid) {
          return {
            id: 0,
            error: {
              message: "Unable to parse response currencyid.",
              code: -1
            }
          }
        }
      }

      return res;
    } catch(e) {
      return {
        id: 0,
        error: {
          message: e.message,
          code: -1
        }
      }
    }
  }
}