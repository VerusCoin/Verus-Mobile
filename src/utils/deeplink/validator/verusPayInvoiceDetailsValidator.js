import { CoinDirectory } from "../../CoinData/CoinDirectory"
import VrpcProvider from '../../vrpc/vrpcInterface';
import { getInfo } from "../../api/channels/vrpc/callCreators";
import { blocksToTime } from "../../math";
import { GenericRequest, VerusPayInvoiceDetails } from "verus-typescript-primitives/dist/vdxf/classes";
import { getCurrency } from "../../api/channels/verusid/callCreators";

/**
 * @param {GenericRequest} request
 * @param {number} detailIndex
 */
export const validateVerusPayInvoiceVDXFObject = (request, detailIndex) => {
  return validateVerusPayInvoiceDetails(request.getDetails(detailIndex).data);
}

/**
 * Validates a VerusPay invoice details before UI is shown to throw
 * fatal errors if anything is off or unable to be processed. Will
 * not return anything.
 * @param {VerusPayInvoiceDetails} details
 */
export const validateVerusPayInvoiceDetails = async (details) => {
  if (!details) throw new Error("No invoice details found.")

  if (details.acceptsNonVerusSystems() && details.excludesVerusBlockchain()) {
    throw new Error("This invoice accepts no systems to pay on, and is therefore unpayable.")
  }

  const coinObj = CoinDirectory.getBasicCoinObj(details.isTestnet() ? 'VRSCTEST' : 'VRSC')
  VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0])

  const chainInfo = await getInfo(coinObj.system_id)
  if (chainInfo.error) throw new Error(chainInfo.error.message)

  const requestedCurrency = await getCurrency(coinObj.system_id, details.requestedcurrencyid)
  if (requestedCurrency.error) throw new Error(requestedCurrency.error.message)

  if (details.isPreconvert()) {
    if (chainInfo.result.longestchain - requestedCurrency.result.startblock >= 0) {
      throw new Error("Destination currency must be in preconvert to pay preconvert invoice.")
    }
  }

  if (details.expires() && details.expiryheight.toNumber() - chainInfo.result.longestchain < 0) {
    const age = (details.expiryheight.toNumber() - chainInfo.result.longestchain) * -1
    
    throw new Error(`This invoice is expired (expired for approx. ${blocksToTime(age)}).`,)
  }

  if (details.isTagged()) {
    throw new Error("Tagged invoices not yet supported.")
  }

  if (details.destinationIsSaplingPaymentAddress()) {
    throw new Error("Sapling invoice destinations not yet supported.")
  }
}