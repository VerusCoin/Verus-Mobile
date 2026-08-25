import { GenericRequest, IdentityUpdateRequestOrdinalVDXFObject } from "verus-typescript-primitives/dist/vdxf/classes";

/**
 * @param {GenericRequest} request
 * @param {number} detailIndex
 */
export const validateIdentityUpdateRequestVDXFObject = (request, detailIndex) => {
  const detailsObject = request.getDetails(detailIndex);

  if (!(detailsObject instanceof IdentityUpdateRequestOrdinalVDXFObject)) {
    throw new Error("Identity update request details not found at specified index");
  }

  if (detailsObject.data == null || detailsObject.data.identity == null) {
    throw new Error("Invalid identity update request details.");
  }
}
