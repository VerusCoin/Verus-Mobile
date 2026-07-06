import { MarketplaceTakeOfferRequestOrdinalVDXFObject } from "verus-typescript-primitives";

export const validateMarketplaceTakeOfferRequestVDXFObject = (request, detailIndex) => {
  const detailsObject = request.getDetails(detailIndex);

  if (!(detailsObject instanceof MarketplaceTakeOfferRequestOrdinalVDXFObject)) {
    throw new Error("Marketplace makeoffer request details not found at specified index");
  }

  if (detailsObject.data == null || !detailsObject.data.isValid()) {
    throw new Error("Invalid marketplace makeoffer request details.");
  }
}
