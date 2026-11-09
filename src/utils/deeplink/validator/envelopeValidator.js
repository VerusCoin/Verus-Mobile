import { AUTHENTICATION_REQUEST_VDXF_KEY, GenericRequest, IDENTITY_UPDATE_REQUEST_VDXF_KEY, PROVISION_IDENTITY_DETAILS_VDXF_KEY, 
  VERUSPAY_INVOICE_DETAILS_VDXF_KEY, VerusPayInvoiceDetailsOrdinalVDXFObject, APP_ENCRYPTION_REQUEST_VDXF_KEY, CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY, SPENDABLE_KEY_DETAILS_VDXF_KEY, SpendableKeyDetailsOrdinalVDXFObject,
  USER_DATA_REQUEST_VDXF_KEY, DATA_PACKET_REQUEST_VDXF_KEY,
  CreateWalletBackupDetailsOrdinalVDXFObject} from "verus-typescript-primitives"
import { validateAuthenticationRequestVDXFObject } from "./authenticationRequestValidator";
import { validateIdentityUpdateRequestVDXFObject } from "./identityUpdateRequestValidator";
import { validateProvisionIdentityDetailsVDXFObject } from "./provisionIdentityDetailsValidator";
import { validateVerusPayInvoiceVDXFObject } from "./verusPayInvoiceDetailsValidator";
import { validateAppEncryptionRequestVDXFObject } from "./appEncryptionRequestValidator";
import { assertSignedRequestAuthorization } from "./appEncryptionAuthorization";
import { validateCreateWalletBackupDetailsVDXFObject } from "./createWalletBackupDetailsValidator";
import { validateSpendableKeyDetailsVDXFObject } from "./spendableKeyDetailsValidator";
import { validateUserDataRequestVDXFObject } from "./userDataRequestValidator";
import { validateDataPacketRequestVDXFObject } from "./dataPacketRequestValidator";
import { VerusIdInterface } from "verusid-ts-client";

/**
 * Checks if a generic envelope has anything in its details that requires
 * a signature. Checks if entire details array contains only signature-optional
 * request types
 * @param {GenericRequest} request 
 */
export const isRequestRequiredSignature = (request) => {
  const details = request.details;

  return !details.every((detail) => {
    return detail instanceof VerusPayInvoiceDetailsOrdinalVDXFObject ||
      detail instanceof SpendableKeyDetailsOrdinalVDXFObject || 
      detail instanceof CreateWalletBackupDetailsOrdinalVDXFObject
  })
}

export const getValidatorForDetail = (detailKey) => {
  const detailValidators = {
    [AUTHENTICATION_REQUEST_VDXF_KEY.vdxfid]: validateAuthenticationRequestVDXFObject,
    [IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid]: validateIdentityUpdateRequestVDXFObject,
    [PROVISION_IDENTITY_DETAILS_VDXF_KEY.vdxfid]: validateProvisionIdentityDetailsVDXFObject,
    [VERUSPAY_INVOICE_DETAILS_VDXF_KEY.vdxfid]: validateVerusPayInvoiceVDXFObject,
    [APP_ENCRYPTION_REQUEST_VDXF_KEY.vdxfid]: validateAppEncryptionRequestVDXFObject,
    [CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY.vdxfid]: validateCreateWalletBackupDetailsVDXFObject,
    [SPENDABLE_KEY_DETAILS_VDXF_KEY.vdxfid]: validateSpendableKeyDetailsVDXFObject,
    [USER_DATA_REQUEST_VDXF_KEY.vdxfid]: validateUserDataRequestVDXFObject,
    [DATA_PACKET_REQUEST_VDXF_KEY.vdxfid]: validateDataPacketRequestVDXFObject
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
  if (!request.isSigned() && (isRequestRequiredSignature(request) || request.hasAppOrDelegatorID())) {
    throw new Error("This type of request requires a signature")
  }

  // Reject missing or malformed fields before ownership checks open signing keys.
  for (let i = 0; i < request.details.length; i++) {
    const detail = request.getDetails(i);
    const detailKey = detail.getIAddressKey();
    const validator = getValidatorForDetail(detailKey);

    await validator(request, i);
  }

  if (request.isSigned()) {
    await assertSignedRequestAuthorization(request);
  } else if (!VerusIdInterface.validateUnsignedGenericRequest(request)) {
    throw new Error("Failed to verify request")
  }
}
