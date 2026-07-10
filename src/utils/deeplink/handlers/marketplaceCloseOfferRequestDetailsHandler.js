/* eslint-disable import/prefer-default-export */
import { MarketplaceCloseOfferRequestOrdinalVDXFObject } from 'verus-typescript-primitives';

export const handleMarketplaceCloseOfferRequestDetailsVDXFObject = async (request, response, detailIndex) => {
  const details = request.getDetails(detailIndex);

  if (details == null) throw new Error('Invalid index for request details');
  if (!(details instanceof MarketplaceCloseOfferRequestOrdinalVDXFObject)) throw new Error('Marketplace closeoffer request details not found at specified index');

  return {
    displayProps: {
      detailsBufferString: details.data.toBuffer().toString('hex'),
      closeOfferRequest: details.data,
    },
    response,
    handledIndices: [],
  };
};
