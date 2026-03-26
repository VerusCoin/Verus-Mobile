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
  
  // Validate Derivation Number is present and non-negative
  const derivationNumber = details.derivationNumber;
  if (!derivationNumber || derivationNumber.isNeg()) {
    throw new Error("Invalid request: derivation number is missing or negative.");
  }
 
  // Validate encryptResponseToAddress is a valid z-address if present
  if (details.hasEncryptResponseToAddress()) {
    try {
      const zAddr = details.encryptResponseToAddress;

      if (!zAddr || !(zAddr.d.length > 0) || !(zAddr.pkD.length > 0)) {
        throw new Error("Invalid encryptResponseToAddress: not a valid Sapling z-address.");
      }
    } catch (e) {
      throw new Error("Invalid encryptResponseToAddress: " + (e.message || "unable to parse z-address"));
    }
  }

  // Validate derivationID is a valid i-address if present
  if (details.hasDerivationID()) {
    try {
      const derivationIdAddr = details.derivationID.toIAddress();
      const coinObj = CoinDirectory.getBasicCoinObj(request.signature.systemID.toIAddress());
      const checkedIdentity = await getIdentity(coinObj.system_id, derivationIdAddr);
      if (!checkedIdentity || checkedIdentity.error || !checkedIdentity.result) {
        throw new Error("Invalid derivationID: not a valid i-address.");
      }
    } catch (e) {
      throw new Error("Invalid derivationID: " + (e.message || "unable to parse i-address"));
    }
  } 
};