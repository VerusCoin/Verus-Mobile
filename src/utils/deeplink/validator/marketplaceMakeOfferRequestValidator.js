import { MarketplaceMakeOfferRequestOrdinalVDXFObject } from "verus-typescript-primitives";

export const validateMarketplaceMakeOfferRequestVDXFObject = (request, detailIndex) => {
  const detailsObject = request.getDetails(detailIndex);

  if (!(detailsObject instanceof MarketplaceMakeOfferRequestOrdinalVDXFObject)) {
    throw new Error("Marketplace makeoffer request details not found at specified index");
  }

  if (detailsObject.data == null || !detailsObject.data.isValid()) {
    throw new Error("Invalid marketplace makeoffer request details.");
  }
}
