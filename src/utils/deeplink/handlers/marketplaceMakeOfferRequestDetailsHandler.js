import { MarketplaceMakeOfferRequestOrdinalVDXFObject } from "verus-typescript-primitives";

export const handleMarketplaceMakeOfferRequestDetailsVDXFObject = async (request, response, detailIndex) => {
  const details = request.getDetails(detailIndex);

  if (details == null) throw new Error("Invalid index for request details");
  if (!(details instanceof MarketplaceMakeOfferRequestOrdinalVDXFObject)) throw new Error("Marketplace makeoffer request details not found at specified index");

  return {
    displayProps: {
      detailsBufferString: details.data.toBuffer().toString('hex'),
      makeOfferRequest: details.data
    },
    response,
    handledIndices: []
  }
}
