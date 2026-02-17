/**
 * Extracts appOrDelegatedID from envelope level
 * @param {GenericRequest} request
 * @returns {string|null} The i-address string or null if not present
 */
export const getAppOrDelegatedID = (request) => {
  if (request.hasAppOrDelegatedID()) {
    return request.appOrDelegatedID.toAddress();
  }
  return null;
};