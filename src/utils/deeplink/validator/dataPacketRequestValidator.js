import {
  DataDescriptor,
  DataPacketRequestDetails,
  DataPacketRequestOrdinalVDXFObject,
  GenericRequest,
} from "verus-typescript-primitives";

/**
 * @param {GenericRequest} request
 * @param {number} detailIndex
 */
export const validateDataPacketRequestVDXFObject = (request, detailIndex) => {
  if (!request.isSigned()) {
    throw new Error("Data packet requests require a signed GenericRequest.");
  }

  const detailsObject = request.getDetails(detailIndex);

  if (!(detailsObject instanceof DataPacketRequestOrdinalVDXFObject)) {
    throw new Error("Data packet request details not found at specified index");
  }

  const details = detailsObject.data;

  if (details == null || !details.isValid()) {
    throw new Error("Invalid data packet request details.");
  }

  if (
    details.flags
      .and(DataPacketRequestDetails.FLAG_FOR_TRANSMITTAL_TO_USER)
      .eq(DataPacketRequestDetails.FLAG_FOR_TRANSMITTAL_TO_USER)
  ) {
    throw new Error(
      "Data packet transmittal to the user is not supported on mobile.",
    );
  }

  if (
    !details.flags
      .and(DataPacketRequestDetails.FLAG_FOR_USERS_SIGNATURE)
      .eq(DataPacketRequestDetails.FLAG_FOR_USERS_SIGNATURE)
  ) {
    throw new Error(
      "Only data packet requests for the user's signature are supported on mobile.",
    );
  }

  if (!Array.isArray(details.signableObjects) || details.signableObjects.length === 0) {
    throw new Error("Data packet request must contain at least one signable object.");
  }

  for (const signableObject of details.signableObjects) {
    if (
      typeof signableObject !== "string" &&
      !(signableObject instanceof DataDescriptor)
    ) {
      throw new Error("Unsupported data packet signable object type.");
    }
  }
};
