/*
 * appEncryptionRequestValidator.js
 * 
 * Validates AppEncryptionRequest details before processing.
 * Implements validation per docs/encrypteddatarequsthandling.md specification.
 * Throws on any error, returns nothing on success.
 */

import { GenericRequest, AppEncryptionRequestOrdinalVDXFObject } from "verus-typescript-primitives";
import { CoinDirectory } from "../../CoinData/CoinDirectory";
import VrpcProvider from "../../vrpc/vrpcInterface";
import { getIdentity } from "../../api/channels/verusid/callCreators";
import { BN } from "bn.js";


// validateAppEncryptionRequestVDXFObject
// Entry point for envelope validator - validates detail at specific index

/**
 * @param {GenericRequest} request
 * @param {number} detailIndex
 */
export const validateAppEncryptionRequestVDXFObject = async (request, detailIndex) => {
  const detail = request.getDetails(detailIndex);
  
  if (!detail) {
    throw new Error(`No detail found at index ${detailIndex}`);
  }
  
  if (!(detail instanceof AppEncryptionRequestOrdinalVDXFObject)) {
    throw new Error("Detail at specified index is not an AppEncryptionRequest");
  }
  
  return validateAppEncryptionRequestDetails(request, detail.data, detailIndex);
};


// validateAppEncryptionRequestDetails
// Validates the AppEncryptionRequestDetails object per specification

/**
 * @param {GenericRequest} request - the parent request (for signature info)
 * @param {import("verus-typescript-primitives").AppEncryptionRequestDetails} details
 * @param {number} detailIndex
 */
export const validateAppEncryptionRequestDetails = async (request, details, detailIndex) => {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Step 1: Verify the outer GenericRequest signature
  // ═══════════════════════════════════════════════════════════════════════════
  if (!request.isSigned()) {
    throw new Error("This request could not be verified. It may have been tampered with.");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 2: Verify responseURIs exist
  // ═══════════════════════════════════════════════════════════════════════════
  if (!request.responseURIs || request.responseURIs.length === 0) {
    throw new Error("This request is invalid — no return address was provided.");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 3: Validate AppEncryptionRequestDetails version
  // ═══════════════════════════════════════════════════════════════════════════
  const version = details.version;
  if (!version || version.isZero() || version.gtn(1)) {
    throw new Error("This request uses an unsupported version.");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 4: Validate derivationNumber
  // ═══════════════════════════════════════════════════════════════════════════
  const derivationNumber = details.derivationNumber;
  if (!derivationNumber || derivationNumber.isNeg()) {
    throw new Error("Invalid request: derivation number is missing or negative.");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 5: Cross-check flags against companion data
  // ═══════════════════════════════════════════════════════════════════════════
  
  // FLAG_HAS_REQUEST_ID (bit 0, value 1)
  const hasRequestIDFlag = details.hasRequestID();
  const hasRequestIDData = details.requestID != null;
  
  if (hasRequestIDFlag && !hasRequestIDData) {
    throw new Error("Invalid request: FLAG_HAS_REQUEST_ID is set but requestID is missing.");
  }
  if (!hasRequestIDFlag && hasRequestIDData) {
    throw new Error("Invalid request: requestID is present but FLAG_HAS_REQUEST_ID is not set.");
  }

  // FLAG_HAS_ENCRYPT_RESPONSE_TO_ADDRESS (bit 1, value 2)
  const hasEncryptResponseFlag = details.hasEncryptResponseToAddress();
  const hasEncryptResponseData = details.encryptResponseToAddress != null;
  
  if (hasEncryptResponseFlag && !hasEncryptResponseData) {
    throw new Error("Invalid request: FLAG_HAS_ENCRYPT_RESPONSE_TO_ADDRESS is set but encryptResponseToAddress is missing.");
  }
  if (!hasEncryptResponseFlag && hasEncryptResponseData) {
    throw new Error("Invalid request: encryptResponseToAddress is present but FLAG_HAS_ENCRYPT_RESPONSE_TO_ADDRESS is not set.");
  }

  // FLAG_HAS_DERIVATION_ID (bit 2, value 4)
  const hasDerivationIDFlag = details.hasDerivationID();
  const hasDerivationIDData = details.derivationID != null;
  
  if (hasDerivationIDFlag && !hasDerivationIDData) {
    throw new Error("Invalid request: FLAG_HAS_DERIVATION_ID is set but derivationID is missing.");
  }
  if (!hasDerivationIDFlag && hasDerivationIDData) {
    throw new Error("Invalid request: derivationID is present but FLAG_HAS_DERIVATION_ID is not set.");
  }

  // FLAG_RETURN_ESK (bit 3, value 8) - no companion data required, just a behavioral flag

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 6: Validate individual fields
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Validate encryptResponseToAddress is a valid z-address if present
  if (hasEncryptResponseData) {
    try {
      const zAddr = details.encryptResponseToAddress.toAddressString();
      if (!zAddr || !zAddr.startsWith('zs')) {
        throw new Error("Invalid encryptResponseToAddress: not a valid Sapling z-address.");
      }
    } catch (e) {
      throw new Error("Invalid encryptResponseToAddress: " + (e.message || "unable to parse z-address"));
    }
  }

  // Validate derivationID is a valid i-address if present
  if (hasDerivationIDData) {
    try {
      const derivationIdAddr = details.derivationID.toIAddress();
      if (!derivationIdAddr || !derivationIdAddr.startsWith('i')) {
        throw new Error("Invalid derivationID: not a valid i-address.");
      }
    } catch (e) {
      throw new Error("Invalid derivationID: " + (e.message || "unable to parse i-address"));
    }
  }

  // Validate requestID is a valid i-address if present
  if (hasRequestIDData) {
    try {
      const requestIdAddr = details.requestID.toIAddress();
      if (!requestIdAddr || !requestIdAddr.startsWith('i')) {
        throw new Error("Invalid requestID: not a valid i-address.");
      }
    } catch (e) {
      throw new Error("Invalid requestID: " + (e.message || "unable to parse i-address"));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Additional: Validate signer identity exists on chain
  // ═══════════════════════════════════════════════════════════════════════════
  const systemID = request.signature.systemID.toIAddress();
  const coinObj = CoinDirectory.getBasicCoinObj(systemID);
  
  if (!coinObj) {
    throw new Error(`Unsupported system: ${systemID}`);
  }
  
  VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);
  
  const requestSignerID = request.signature.identityID.toIAddress();
  const signerIdentity = await getIdentity(coinObj.system_id, requestSignerID);
  
  if (signerIdentity.error) {
    throw new Error(`Failed to fetch request signer identity: ${signerIdentity.error.message}`);
  }
  
  if (!signerIdentity.result) {
    throw new Error(`Request signer identity ${requestSignerID} not found on chain`);
  }

  // Validation passed - no return value
};