import {
  GenericRequest,
  UserDataRequestDetails,
  UserDataRequestOrdinalVDXFObject,
} from "verus-typescript-primitives";
import { getUserDataRequestedSignerID } from "../userData/requestedSigner";

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

  if (!request.hasEncryptResponseToAddress() || request.encryptResponseToAddress == null) {
    throw new Error("Credential user data requests must specify encryptResponseToAddress.");
  }

  try {
    request.encryptResponseToAddress.toAddressString();
  } catch (e) {
    throw new Error("Invalid encryptResponseToAddress for credential user data request.");
  }

  if (!details.dataType.eq(UserDataRequestDetails.FULL_DATA)) {
    throw new Error("Only full credential data requests are supported on mobile.");
  }

  getUserDataRequestedSignerID(details);

  if (!Array.isArray(details.searchDataKey) || details.searchDataKey.length === 0) {
    throw new Error("User data request must specify at least one credential key.");
  }

  const hasInvalidSearchDataKey = details.searchDataKey.some(item => {
    if (item == null || typeof item !== "object") return true;

    const keys = Object.keys(item);

    return keys.length !== 1 || !Buffer.isBuffer(item[keys[0]]);
  });

  if (hasInvalidSearchDataKey) {
    throw new Error("User data request credential search values must be binary hashes.");
  }
};
