import { GenericRequest, ProvisionIdentityDetailsOrdinalVDXFObject } from "verus-typescript-primitives/dist/vdxf/classes";

/**
 * @param {GenericRequest} request
 * @param {number} detailIndex
 */
export const validateProvisionIdentityDetailsVDXFObject = (request, detailIndex) => {
  const detailsObject = request.getDetails(detailIndex);

  if (!(detailsObject instanceof ProvisionIdentityDetailsOrdinalVDXFObject)) {
    throw new Error("Provision identity details not found at specified index");
  }

  if (detailsObject.data == null || !detailsObject.data.isValid()) {
    throw new Error("Invalid provision identity details.");
  }
}
