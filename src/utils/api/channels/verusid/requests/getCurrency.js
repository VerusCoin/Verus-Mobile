import VrpcProvider from "../../../../vrpc/vrpcInterface"
import { validateLookupBinding } from "./lookupBinding";

export const getCurrency = async (systemId, iAddressOrName) => {
  const res = await VrpcProvider.getEndpoint(systemId).getCurrency(iAddressOrName);

  if (res.error) return res;
  else {
    const currencyDefinition = res.result;

    try {
      validateLookupBinding(
        systemId,
        iAddressOrName,
        currencyDefinition.currencyid,
        currencyDefinition.fullyqualifiedname,
        "currency",
      );

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
