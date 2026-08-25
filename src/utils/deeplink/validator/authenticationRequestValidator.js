import { AuthenticationRequestOrdinalVDXFObject, GenericRequest } from "verus-typescript-primitives/dist/vdxf/classes";
import BN from "bn.js";

export const assertAuthenticationRequestNotExpired = (
  details,
  nowSeconds = Math.floor(Date.now() / 1000),
) => {
  if (details == null || !details.hasExpiryTime()) return;

  if (
    details.expiryTime == null ||
    !Number.isSafeInteger(nowSeconds) ||
    nowSeconds < 0
  ) {
    throw new Error("Invalid authentication request expiry time.");
  }

  if (details.expiryTime.lte(new BN(nowSeconds))) {
    throw new Error("Authentication request has expired.");
  }
};

export const assertAuthenticationRequestsNotExpired = (
  request,
  nowSeconds = Math.floor(Date.now() / 1000),
) => {
  for (const detail of request?.details || []) {
    if (detail instanceof AuthenticationRequestOrdinalVDXFObject) {
      assertAuthenticationRequestNotExpired(detail.data, nowSeconds);
    }
  }
};

/**
 * Keep the expiry check and signing invocation in the same synchronous turn.
 * Async response preparation may take a request past its expiry after the
 * initial request-info screen validated it.
 */
export const performAfterAuthenticationExpiryCheck = (
  request,
  operation,
  nowSeconds = Math.floor(Date.now() / 1000),
) => {
  if (typeof operation !== "function") {
    throw new Error("An authentication request operation is required.");
  }

  assertAuthenticationRequestsNotExpired(request, nowSeconds);
  return operation();
};

export const signAfterAuthenticationExpiryCheck = (
  request,
  signResponse,
  nowSeconds = Math.floor(Date.now() / 1000),
) => performAfterAuthenticationExpiryCheck(
  request,
  signResponse,
  nowSeconds,
);

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

  assertAuthenticationRequestNotExpired(detailsObject.data);
}
