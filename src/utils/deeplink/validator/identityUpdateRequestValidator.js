import {MIN_IDENTITY_UPDATE_EXPIRY_DELTA} from 'verusid-ts-client';
import { GenericRequest, IdentityUpdateRequestOrdinalVDXFObject } from "verus-typescript-primitives";

export const assertIdentityUpdateRequestConstraints = (details, {
  systemId, isTestnet, height, chainId,
}) => {
  const requestSystem = details.systemID?.toAddress() ||
    (isTestnet ? 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq' : 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV');
  if (requestSystem !== systemId || chainId !== systemId) {
    throw new Error('The identity update request is for a different network.');
  }
  if (!Number.isSafeInteger(height) || height < 0 || height >= 500000000 - MIN_IDENTITY_UPDATE_EXPIRY_DELTA) {
    throw new Error('Unable to verify the current network height.');
  }
  if (details.expiryHeight != null) {
    const expiry = details.expiryHeight.toNumber();
    if (!Number.isSafeInteger(expiry) || expiry < height + MIN_IDENTITY_UPDATE_EXPIRY_DELTA || expiry >= 500000000) {
      throw new Error('This identity update request has expired or leaves fewer than four blocks for inclusion. Request a new update.');
    }
  }
};

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
