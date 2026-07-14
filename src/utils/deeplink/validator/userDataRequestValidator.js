import {
  GenericRequest,
  UserDataRequestDetails,
  UserDataRequestOrdinalVDXFObject,
} from "verus-typescript-primitives";

/**
 * @param {GenericRequest} request
 * @param {number} detailIndex
 */
export const validateUserDataRequestVDXFObject = (request, detailIndex) => {
  if (!request.isSigned()) {
    throw new Error("User data requests require a signed GenericRequest.");
  }

  const detailsObject = request.getDetails(detailIndex);

  if (!(detailsObject instanceof UserDataRequestOrdinalVDXFObject)) {
    throw new Error("User data request details not found at specified index");
  }

  const details = detailsObject.data;

  if (details == null || !details.isValid()) {
    throw new Error("Invalid user data request details.");
  }

  if (!details.requestType.eq(UserDataRequestDetails.CREDENTIAL)) {
    throw new Error("Only credential user data requests are supported on mobile.");
  }

  if (!details.dataType.eq(UserDataRequestDetails.FULL_DATA)) {
    throw new Error("Only full credential data requests are supported on mobile.");
  }

  if (!Array.isArray(details.searchDataKey) || details.searchDataKey.length === 0) {
    throw new Error("User data request must specify at least one credential key.");
  }
};
