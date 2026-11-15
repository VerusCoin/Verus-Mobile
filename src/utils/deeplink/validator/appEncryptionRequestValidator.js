/*
 * appEncryptionRequestValidator.js
 *
 * Validates AppEncryptionRequest details before processing.
 * Throws on any error, returns nothing on success.
 */

import {
  GenericRequest,
  AppEncryptionRequestOrdinalVDXFObject,
  decodeDestination,
  I_ADDR_VERSION,
} from "verus-typescript-primitives";
import { BN } from "bn.js";

const MAX_NATIVE_INDEX = new BN("2147483647");

// Both native bridges use signed 32-bit indices. Check the BN before narrowing.
export const checkedNativeIndex = (index, name = "derivation number") => {
  if (!BN.isBN(index) || index.isNeg() || index.gt(MAX_NATIVE_INDEX)) {
    throw new Error(`Invalid ${name}: expected a number from 0 to 2147483647.`);
  }

  return index.toNumber();
};

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

/**
 * @param {GenericRequest} request - the parent request (for signature info)
 * @param {import("verus-typescript-primitives").AppEncryptionRequestDetails} details
 * @param {number} detailIndex
 */
export const validateAppEncryptionRequestDetails = async (request, details, detailIndex) => {
  checkedNativeIndex(details.derivationNumber);
  checkedNativeIndex(details.secondaryDerivationNumber, "secondary derivation number");

  // Viewing keys are sensitive too; every channel response must be encrypted.
  if (!details.hasEncryptResponseToAddress()) {
    throw new Error(
      "App encryption requests must specify encryptResponseToAddress.",
    );
  }

  const zAddr = details.encryptResponseToAddress;

  if (!zAddr || zAddr.d?.length !== 11 || zAddr.pkD?.length !== 32) {
    throw new Error("Invalid encryptResponseToAddress: not a valid Sapling z-address.");
  }

  // Nested targets only need a valid identity identifier, not an on-chain record.
  if (details.hasDerivationID()) {
    try {
      decodeDestination(details.derivationID.toIAddress(), I_ADDR_VERSION);
    } catch (e) {
      throw new Error("Invalid derivationID: " + (e.message || "unable to parse i-address"));
    }
  }
};
