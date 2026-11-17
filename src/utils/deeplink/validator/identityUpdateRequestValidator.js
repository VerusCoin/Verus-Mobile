import {MIN_IDENTITY_UPDATE_EXPIRY_DELTA} from 'verusid-ts-client';
import { GenericRequest, IdentityUpdateRequestOrdinalVDXFObject } from "verus-typescript-primitives";
import {createGenericRequestRejectionError, GENERIC_REQUEST_REJECTION_CODES} from '../genericRequestRejection';

export const assertIdentityUpdateRequestConstraints = (details, {
  systemId, isTestnet, height, chainId,
}) => {
  const requestSystem = details.systemID?.toAddress() ||
    (isTestnet ? 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq' : 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV');
  if (requestSystem !== systemId || chainId !== systemId) {
    throw createGenericRequestRejectionError(
      GENERIC_REQUEST_REJECTION_CODES.NETWORK_MISMATCH,
      'The identity update request is for a different network.',
      {rejectionMessage: 'The identity update request is for a different network. Ask the requester for a new update.'},
    );
  }
  if (!Number.isSafeInteger(height) || height < 0 || height >= 500000000 - MIN_IDENTITY_UPDATE_EXPIRY_DELTA) {
    throw createGenericRequestRejectionError(
      GENERIC_REQUEST_REJECTION_CODES.NETWORK_HEIGHT_UNAVAILABLE,
      'Unable to verify the current network height.',
    );
  }
  if (details.expiryHeight != null) {
    const expiry = details.expiryHeight.toNumber();
    if (!Number.isSafeInteger(expiry) || expiry < height + MIN_IDENTITY_UPDATE_EXPIRY_DELTA || expiry >= 500000000) {
      throw createGenericRequestRejectionError(
        GENERIC_REQUEST_REJECTION_CODES.EXPIRED,
        'This identity update request has expired or leaves fewer than four blocks for inclusion. Request a new update.',
        {rejectionMessage: 'Ask the requester for a new update with at least 4 blocks for inclusion.'},
      );
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
    throw createGenericRequestRejectionError(GENERIC_REQUEST_REJECTION_CODES.IDENTITY_UPDATE_REFUSED,
      'Identity update request details not found at specified index');
  }

  if (detailsObject.data == null || detailsObject.data.identity == null) {
    throw createGenericRequestRejectionError(GENERIC_REQUEST_REJECTION_CODES.IDENTITY_UPDATE_REFUSED,
      'Invalid identity update request details.');
  }
}
