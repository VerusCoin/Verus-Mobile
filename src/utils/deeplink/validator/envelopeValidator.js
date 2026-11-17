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
import {
  createGenericRequestRejectionError,
  GENERIC_REQUEST_REJECTION_CODES,
} from '../genericRequestRejection';
import {createDelegatedSignerAccountError} from '../delegatedSignerGate';
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
    throw createGenericRequestRejectionError(
      GENERIC_REQUEST_REJECTION_CODES.DETAIL_UNSUPPORTED,
      'No validator function found for key ' + detailKey,
    )
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
    throw createGenericRequestRejectionError(
      GENERIC_REQUEST_REJECTION_CODES.INVALID,
      'This type of request requires a signature',
    )
  }

  // Reject missing or malformed fields before ownership checks open signing keys.
  for (let i = 0; i < request.details.length; i++) {
    const detail = request.getDetails(i);
    const detailKey = detail.getIAddressKey();
    const validator = getValidatorForDetail(detailKey);

    await validator(request, i);
  }

  // The library's structure rule runs again inside signature verification and
  // returns false there too. Check it first, so a request with a valid
  // signature but a forbidden detail order or combination is refused as not
  // valid, not as a signature that cannot be verified.
  if (request.isSigned() && !VerusIdInterface.validateUnsignedGenericRequest(request)) {
    throw createGenericRequestRejectionError(
      GENERIC_REQUEST_REJECTION_CODES.INVALID,
      'Invalid request structure',
    )
  }

  if (request.isSigned()) {
    try {
      await assertSignedRequestAuthorization(request);
    } catch (error) {
      // Keep the redesign's wallet-switch and rejection UI. Authorization stays
      // wholly upstream; only its error is translated after it refuses access.
      if (request.hasAppOrDelegatorID() && (
        error.message === 'The active profile must fully control the identity signing threshold. Delegate authorization is unsupported.' ||
        error.message === 'The active profile must fully control every signing authority at the request signing height.' ||
        error.message === 'The active profile cannot use the required identity signing keys.'
      )) throw createDelegatedSignerAccountError(error.message);
      if (error.message === 'Failed to verify request signature') {
        throw createGenericRequestRejectionError(GENERIC_REQUEST_REJECTION_CODES.SIGNATURE_INVALID, error.message);
      }
      if (error.message === 'The request is on a different network.') {
        throw createGenericRequestRejectionError(GENERIC_REQUEST_REJECTION_CODES.NETWORK_MISMATCH, error.message,
          {requestIsTestnet: request.isTestnet(), networksConflict: true});
      }
      throw error;
    }
  } else if (!VerusIdInterface.validateUnsignedGenericRequest(request)) {
    throw createGenericRequestRejectionError(
      GENERIC_REQUEST_REJECTION_CODES.INVALID,
      'Invalid request structure',
    )
  }
}
