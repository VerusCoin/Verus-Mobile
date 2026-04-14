import { AuthenticationRequestOrdinalVDXFObject, GenericRequest } from "verus-typescript-primitives/dist/vdxf/classes";

/**
 * @param {GenericRequest} request 
 * @param {number} detailIndex
 */
export const validateAuthenticationRequestVDXFObject = (request, detailIndex) => {
  const detailsObject = request.getDetails(detailIndex);

  if (!(detailsObject instanceof AuthenticationRequestOrdinalVDXFObject)) {
    throw new Error("Authentication request details not found at specified index");
  }

  if (detailsObject.data == null || !detailsObject.data.isValid()) {
    throw new Error("Invalid authentication request details.");
  }
}
