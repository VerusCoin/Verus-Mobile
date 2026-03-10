import { AUTHENTICATION_REQUEST_VDXF_KEY, GenericRequest, IDENTITY_UPDATE_REQUEST_VDXF_KEY, PROVISION_IDENTITY_DETAILS_VDXF_KEY, VERUSPAY_INVOICE_DETAILS_VDXF_KEY, VerusPayInvoiceDetailsOrdinalVDXFObject } from "verus-typescript-primitives"
import { getInfo, verifyGenericRequest } from "../../api/channels/vrpc/callCreators"
import { getIdentity } from "../../api/channels/verusid/callCreators";
import { validateAuthenticationRequestVDXFObject } from "./authenticationRequestValidator";
import { validateIdentityUpdateRequestVDXFObject } from "./identityUpdateRequestValidator";
import { validateProvisionIdentityDetailsVDXFObject } from "./provisionIdentityDetailsValidator";
import { validateVerusPayInvoiceVDXFObject } from "./verusPayInvoiceDetailsValidator";
import { CoinDirectory } from "../../CoinData/CoinDirectory";
import VrpcProvider from '../../vrpc/vrpcInterface';
import store from "../../../store";
import { coinsList } from "../../CoinData/CoinsList";
import { VRPC } from "../../constants/intervalConstants";

/**
 * Checks if a generic envelope has anything in its details that requires
 * a signature. Checks if entire details array contains only signature-optional
 * request types
 * @param {GenericRequest} request 
 */
export const isRequestRequiredSignature = (request) => {
  const details = request.details;

  return !details.every((detail) => {
    return detail instanceof VerusPayInvoiceDetailsOrdinalVDXFObject 
  })
}

export const getValidatorForDetail = (detailKey) => {
  const detailValidators = {
    [AUTHENTICATION_REQUEST_VDXF_KEY.vdxfid]: validateAuthenticationRequestVDXFObject,
    [IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid]: validateIdentityUpdateRequestVDXFObject,
    [PROVISION_IDENTITY_DETAILS_VDXF_KEY.vdxfid]: validateProvisionIdentityDetailsVDXFObject,
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

    if (!await verifyGenericRequest(coinObj, request, signedBy.result, false)) {
      throw new Error("Failed to verify request signature")
    }

    if (request.hasAppOrDelegatedID()) {
      if (request.appOrDelegatedID.toAddress() !== request.signature.identityID.toAddress()) {
        const state = store.getState();
        const activeAccount = state.authentication.activeAccount;

        if (activeAccount == null) {
          throw new Error("Active account required to validate delegated request signer");
        }

        const vrscSystem = request.isTestnet() ? coinsList.VRSCTEST : coinsList.VRSC;
        const userVrscAddresses =
          activeAccount.keys[vrscSystem.id]?.[VRPC]?.addresses || [];

        const signerIdentity = signedBy.result.identity;
        const signerPrimaryAddresses = signerIdentity.primaryaddresses || [];
        const signerMinSigs = signerIdentity.minimumsignatures;

        const signerMatchesUser =
          signerMinSigs === 1 &&
          signerPrimaryAddresses.some((address) => userVrscAddresses.includes(address));

        if (!signerMatchesUser) {
          throw new Error("Request not signed by appOrDelegatedID or a user-controlled VerusID.");
        }
      }
    }
  } else if (isRequestRequiredSignature(request) || request.hasAppOrDelegatedID()) {
    throw new Error("This type of request requires a signature")
  } else {
    if (await verifyGenericRequest(coinObj, request, signedBy.result, true)) {
      throw new Error("Failed to verify request")
    }
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
