import { AUTHENTICATION_REQUEST_VDXF_KEY, GenericRequest, VERUSPAY_INVOICE_DETAILS_VDXF_KEY, VerusPayInvoiceOrdinalVDXFObject } from "verus-typescript-primitives"
import { getInfo, verifyGenericRequest } from "../../api/channels/vrpc/callCreators"
import { getIdentity } from "../../api/channels/verusid/callCreators";
import { validateAuthenticationRequestVDXFObject } from "./authenticationRequestValidator";
import { validateVerusPayInvoiceVDXFObject } from "./verusPayInvoiceDetailsValidator";
import { CoinDirectory } from "../../CoinData/CoinDirectory";
import VrpcProvider from '../../vrpc/vrpcInterface';

/**
 * Checks if a generic envelope has anything in its details that requires
 * a signature. Checks if entire details array contains only signature-optional
 * request types
 * @param {GenericRequest} request 
 */
export const isRequestRequiredSignature = (request) => {
  const details = request.details;

  return !details.every((detail) => {
    return detail instanceof VerusPayInvoiceOrdinalVDXFObject 
  })
}

export const getValidatorForDetail = (detailKey) => {
  const detailValidators = {
    [AUTHENTICATION_REQUEST_VDXF_KEY.vdxfid]: validateAuthenticationRequestVDXFObject,
    [VERUSPAY_INVOICE_DETAILS_VDXF_KEY.vdxfid]: validateVerusPayInvoiceVDXFObject
  }

  if (Object.keys(detailValidators).includes(detailKey)) {
    return detailValidators[detailKey];
  } else {
    throw new Error("No validator function found for key " + detailKey)
  }
}

/**
 * Validates a generic request and all its details, 
 * throws on invalid and returns nothing.
 * @param {any} coinObj
 * @param {GenericRequest} request 
 */
export const validateGenericRequest = async (request) => {
  if (request.isSigned()) {
    const coinObj = CoinDirectory.getBasicCoinObj(request.signature.systemID.toIAddress())
    VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0])

    if (!!coinObj.testnet !== request.isTestnet()) {
      throw new Error(`Cannot validate request made for ${request.isTestnet() ? "testnet" : "mainnet"} on ${coinObj.testnet ? "testnet" : "mainnet"}`)
    }

    const signedBy = await getIdentity(coinObj.system_id, request.signature.identityID.toIAddress())
    if (signedBy.error) throw new Error(signedBy.error.message)

    if (!await verifyGenericRequest(coinObj, request, signedBy.result)) {
      throw new Error("Failed to verify request signature")
    }
  } else if (isRequestRequiredSignature(request)) {
    throw new Error("This type of request requires a signature")
  }

  if (request.hasEncryptResponseToAddress()) {
    throw new Error("Encrypt response to address not yet supported.")
  }

  for (let i = 0; i < request.details.length; i++) {
    const detail = request.getDetails(i);
    const detailKey = detail.getIAddressKey();
    const validator = getValidatorForDetail(detailKey);

    await validator(request, i);
  }
}
