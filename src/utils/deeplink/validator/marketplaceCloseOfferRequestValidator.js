/* eslint-disable import/prefer-default-export */
import { MarketplaceCloseOfferRequestOrdinalVDXFObject } from 'verus-typescript-primitives';

export const validateMarketplaceCloseOfferRequestVDXFObject = (request, detailIndex) => {
  const detailsObject = request.getDetails(detailIndex);

  if (!(detailsObject instanceof MarketplaceCloseOfferRequestOrdinalVDXFObject)) {
    throw new Error('Marketplace closeoffer request details not found at specified index');
  }

  if (detailsObject.data == null || !detailsObject.data.isValid()) {
    throw new Error('Invalid marketplace closeoffer request details.');
  }
};
