import { MarketplaceTakeOfferRequestOrdinalVDXFObject } from "verus-typescript-primitives";

export const handleMarketplaceTakeOfferRequestDetailsVDXFObject = async (request, response, detailIndex) => {
  const details = request.getDetails(detailIndex);

  if (details == null) throw new Error("Invalid index for request details");
  if (!(details instanceof MarketplaceTakeOfferRequestOrdinalVDXFObject)) throw new Error("Marketplace takeoffer request details not found at specified index");

  return {
    displayProps: {
      detailsBufferString: details.data.toBuffer().toString('hex'),
      takeOfferRequest: details.data
    },
    response,
    handledIndices: []
  }
}
