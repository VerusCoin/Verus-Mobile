/*
 * appEncryptionRequestHandler.js
 * 
 * Handles AppEncryptionRequest from GenericRequest envelope.
 * Shows user approval UI before deriving encryption keys.
 */

import {
  AppEncryptionRequestDetails,
  AppEncryptionResponseDetails,
  AppEncryptionRequestOrdinalVDXFObject,
  AppEncryptionResponseOrdinalVDXFObject,
  SaplingPaymentAddress,
  DataDescriptor,
  DataDescriptorOrdinalVDXFObject,
  GenericRequest,
  GenericResponse,
  IdentityID,
  DataDescriptorKey,
  VdxfUniValue
} from "verus-typescript-primitives";

import { SaplingExtendedViewingKey } from "verus-typescript-primitives/dist/pbaas/SaplingExtendedViewingKey";
import { SaplingExtendedSpendingKey } from "verus-typescript-primitives/dist/pbaas/SaplingExtendedSpendingKey";

import { BN } from "bn.js";
import { CoinDirectory } from "../../CoinData/CoinDirectory";
import VrpcProvider from "../../vrpc/vrpcInterface";
import store from "../../../store";
import { getIdentity } from "../../api/channels/verusid/callCreators";
import { getSystemNameFromSystemId } from "../../CoinData/CoinData";
import { convertFqnToDisplayFormat } from "../../fullyqualifiedname";
import { getBlock } from "../../api/channels/vrpc/requests/getBlock";
import { getSignatureInfo } from "../../api/channels/vrpc/requests/getSignatureInfo";

import { requestPrivKey, requestSeeds } from "../../auth/authBox";
import { DLIGHT_PRIVATE } from "../../constants/intervalConstants";
import { isDlightSpendingKey } from "../../keys";

import { z_getencryptionaddress } from "../../api/channels/dlight/requests/zGetEncryptionAddress";
import { encryptData } from "../../api/channels/dlight/requests/encrypt";


/**
 * Gets key material for z_getencryptionaddress.
 * 
 *
 * Returns { mnemonicSeed }.
 * The native module converts mnemonicSeed via SeedPhrase.new() internally.
 *
 * @returns {Promise<{mnemonicSeed?: string}>}
 * @throws {Error} If no key material can be retrieved
 */
const getKeyMaterial = async () => {

  try {
    const seeds = await requestSeeds();
    const dlightSeed = seeds[DLIGHT_PRIVATE];
    if (dlightSeed) {
      if (isDlightSpendingKey(dlightSeed)) {
        // Stored "seed" is actually an extsk (bech32 spending key).
        // Can't use it as a mnemonic — fall through to extsk path.

      } else {
        // Raw mnemonic seed — this is what the daemon's z_getencryptionaddress expects.
        return { mnemonicSeed: dlightSeed };
      }
    }
  } catch (_) {
    throw new Error(
      `No Z (shielded address) seed has been set up. ` +
      `Please go to Settings → Profile and set up a Z Seed before accepting encryption requests.`
    );
  }
};

// ============================================================================
// Main Handler - Returns displayProps for UI
// ============================================================================

/**
 * Entry point called from GenericRequestHome.
 * Prepares display props for AppEncryptionRequestInfo UI.
 * Actual key derivation happens after user approval.
 * 
 * @param {GenericRequest} request - The parent GenericRequest
 * @param {GenericResponse} response - The response being built
 * @param {number} detailIndex - Index of this detail in request.details
 * @returns {Promise<{ displayProps: object, response: GenericResponse, handledIndices: number[] }>}
 * @throws {Error} If processing fails
 */
export const handleAppEncryptionRequestVDXFObject = async (request, response, detailIndex) => {
  const detail = request.getDetails(detailIndex);

  if (!detail || !(detail instanceof AppEncryptionRequestOrdinalVDXFObject)) {
    throw new Error("Invalid AppEncryptionRequest detail at index " + detailIndex);
  }

  const encryptionRequest = detail.data;
  const systemID = request.signature.systemID.toIAddress();
  const requestSignerID = request.signature.identityID.toIAddress();

  const coinObj = CoinDirectory.getBasicCoinObj(systemID);

  if (!coinObj) {
    throw new Error("Unsupported system: " + systemID);
  }

  VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);

  // Resolve signer identity to FQN
  let signerFqn = requestSignerID;
  let signerSystemName = getSystemNameFromSystemId(systemID);
  let sigtime = null;

  try {
    const signedBy = await getIdentity(coinObj.system_id, requestSignerID);
    if (!signedBy.error && signedBy.result?.fullyqualifiedname) {
      signerFqn = convertFqnToDisplayFormat(signedBy.result.fullyqualifiedname);
    }

    // Get signature timestamp
    const sig = await getSignatureInfo(
      coinObj.system_id,
      request.signature.identityID.toIAddress(),
      request.signature.signatureAsVch.toString('base64')
    );

    if (sig && sig.height != null) {
      const sigblock = await getBlock(coinObj.system_id, sig.height);
      if (!sigblock.error && sigblock.result) {
        sigtime = sigblock.result.time;
      }
    }
  } catch (_) { }

  // Resolve derivationID to FQN if present
  let derivationIdFqn = null;
  if (encryptionRequest.hasDerivationID()) {
    const derivationIdAddr = encryptionRequest.derivationID.toIAddress();
    derivationIdFqn = derivationIdAddr;
    try {
      const derivationIdentity = await getIdentity(coinObj.system_id, derivationIdAddr);
      if (!derivationIdentity.error && derivationIdentity.result?.fullyqualifiedname) {
        derivationIdFqn = convertFqnToDisplayFormat(derivationIdentity.result.fullyqualifiedname);
      }
    } catch (_) { }
  }

  // Resolve requestID to FQN if present
  let requestIdFqn = null;
  if (encryptionRequest.hasRequestID()) {
    const requestIdAddr = encryptionRequest.requestID.toIAddress();
    requestIdFqn = requestIdAddr;
    try {
      const requestIdentity = await getIdentity(coinObj.system_id, requestIdAddr);
      if (!requestIdentity.error && requestIdentity.result?.fullyqualifiedname) {
        requestIdFqn = convertFqnToDisplayFormat(requestIdentity.result.fullyqualifiedname);
      }
    } catch (_) {
      // Keep raw i-address if resolution fails
    }
  }

  // Get encrypt response to address if present
  let encryptResponseToAddress = null;
  if (encryptionRequest.hasEncryptResponseToAddress()) {
    encryptResponseToAddress = encryptionRequest.encryptResponseToAddress.toAddressString();
  }

  return {
    displayProps: {
      detailsBufferString: detail.data.toBuffer().toString('hex'),
      signerFqn,
      signerSystemID: systemID,
      signerSystemName,
      signerIdentityID: requestSignerID,
      sigtime,
      derivationNumber: encryptionRequest.derivationNumber.toNumber(),
      derivationIdFqn,
      hasDerivationID: encryptionRequest.hasDerivationID(),
      requestIdFqn,
      hasRequestID: encryptionRequest.hasRequestID(),
      encryptResponseToAddress,
      hasEncryptResponseToAddress: encryptionRequest.hasEncryptResponseToAddress(),
      returnESK: encryptionRequest.returnESK(),
    },
    response,
    handledIndices: []
  };
};



// ============================================================================
// Processing Function - Called after user approval
// ============================================================================

/**
 * Derives keys and builds the response object.
 * Called by AppEncryptionRequestInfo after user approval.
 * 
 * @param {Object} params
 * @param {GenericRequest} params.request - The parent GenericRequest
 * @param {number} params.detailIndex - Index of the encryption request detail
 * @param {string} params.responseSignerID - The user's signing identity i-address
 * @returns {Promise<AppEncryptionResponseOrdinalVDXFObject|DataDescriptorOrdinalVDXFObject>}
 * @throws {Error} If processing fails
 */
export const processAppEncryptionRequest = async ({
  request,
  detailIndex,
  responseSignerID,
}) => {
  const detail = request.getDetails(detailIndex);

  if (!detail || !(detail instanceof AppEncryptionRequestOrdinalVDXFObject)) {
    throw new Error("Invalid AppEncryptionRequest detail at index " + detailIndex);
  }

  const encryptionRequest = detail.data;
  const systemID = request.signature.systemID.toIAddress();
  const requestSignerID = request.signature.identityID.toIAddress();

  // Get appOrDelegatedID if present
  let appOrDelegatedID = null;
  try {
    if (request.appOrDelegatedID) {
      appOrDelegatedID = request.appOrDelegatedID.toAddress();
    }
  } catch (e) {
    // appOrDelegatedID is optional
  }

  const coinObj = CoinDirectory.getBasicCoinObj(systemID);

  if (!coinObj) {
    throw new Error("Unsupported system: " + systemID);
  }

  // Get key material (either extsk or mnemonicSeed) for derivation
  const keyMaterial = await getKeyMaterial(coinObj.id);

  // Use appOrDelegatedID if present, otherwise use requestSignerID
  const appID = appOrDelegatedID || requestSignerID;

  // Check if spending key requested via flags
  const returnESK = encryptionRequest.returnESK();

  // Determine toId: the derivationID from the encryption request is the
  // identity we derive a shared key with (matches daemon's "toid").
  // Falls back to appOrDelegatedID or requestSignerID if no derivationID.
  let toIdAddress;
  if (encryptionRequest.hasDerivationID()) {
    toIdAddress = encryptionRequest.derivationID.toIAddress();
  } else {
    toIdAddress = appID;
  }

  // Convert i-addresses to 20-byte hex strings for the native module.
  // The native Rust code (verus_zfunc) reverses these bytes before hashing,
  // but the C++ daemon hashes uint160::data[] directly (no reversal).
  // To compensate, we send the bytes pre-reversed so that after the Rust
  // reversal they end up in the original order—matching the daemon.
  const fromIdBytes = IdentityID.fromAddress(responseSignerID).hash;
  const toIdBytes = IdentityID.fromAddress(toIdAddress).hash;
  let fromIdHex = Buffer.from(fromIdBytes).reverse().toString('hex');
  let toIdHex = Buffer.from(toIdBytes).reverse().toString('hex');

  // Ensure even-length hex (native Hex.decode requires it).
  // This should always be 40 chars from a 20-byte hash, but guard against edge cases.
  if (fromIdHex.length % 2 !== 0) fromIdHex = '0' + fromIdHex;
  if (toIdHex.length % 2 !== 0) toIdHex = '0' + toIdHex;


  // Build derivation params matching ChannelKeysRequest interface.
  // When using an extsk (already-derived spending key), omit hdIndex so the
  // JS wrapper sends -1 ("not provided") to the native module.  The native
  // code rejects hdIndex >= 0 together with a spending key because HD
  // derivation only applies to a mnemonic seed.
  let derivationParams = {
    ...keyMaterial,           // { mnemonicSeed }
    fromId: fromIdHex,
    toId: toIdHex,
    ...(keyMaterial.mnemonicSeed ? { hdIndex: 0 } : {}),
    encryptionIndex: encryptionRequest.derivationNumber.toNumber(),
    returnSecret: returnESK
  };

  // Derive channel keys
  const derivationResult = await z_getencryptionaddress(coinObj.system_id, derivationParams);
  
  // Clear sensitive data from memory as soon as possible
  derivationParams = null;

  if (derivationResult.err) {
    const errMsg = typeof derivationResult.err === 'string'
      ? derivationResult.err
      : derivationResult.result?.message || derivationResult.result?.toString() || String(derivationResult.err);
    throw new Error("Key derivation failed: " + errMsg);
  }

  const keys = derivationResult.result;

  // Build response details
  let responseDetails;
  let responseFlags = new BN(0);

  // Set flags based on what we're returning
  if (encryptionRequest.hasRequestID()) {
    responseFlags = responseFlags.or(AppEncryptionRequestDetails.FLAG_HAS_REQUEST_ID);
  }
  if (returnESK) {
    responseFlags = responseFlags.or(AppEncryptionRequestDetails.FLAG_HAS_EXTENDED_SPENDING_KEY);
  }

  if (!keys.ivk || !keys.extfvk || !keys.address) {
    throw new Error("Incomplete key derivation result");
  }

  if (returnESK && !keys.spendingKey) {
    throw new Error("Spending key requested but not returned");
  }
  responseDetails = new AppEncryptionResponseDetails({
    version: new BN(1),
    flags: responseFlags,
    incomingViewingKey: Buffer.from(keys.ivk, 'hex'),
    extendedViewingKey: SaplingExtendedViewingKey.fromKeyString(keys.extfvk),
    address: SaplingPaymentAddress.fromAddressString(keys.address),
    extendedSpendingKey: returnESK
      ? SaplingExtendedSpendingKey.fromKeyString(keys.spendingKey)
      : undefined,
    requestID: encryptionRequest.hasRequestID() ? encryptionRequest.requestID : undefined,
  });


  // Get the encrypt to address or return null as it's optional
  const encryptTo = encryptionRequest.hasEncryptResponseToAddress()
    ? encryptionRequest.encryptResponseToAddress.toAddressString()
    : null;

  if (!encryptTo) {
    // Return unencrypted response
    return {
      responseDetail: new AppEncryptionResponseOrdinalVDXFObject({
        data: responseDetails
      }),
      encryptedDescriptorJson: null,
    };
  }

  // Encrypt response
  const responseBuffer = responseDetails.toBuffer();

  //wrap data in a DataDescriptor for encryption

  const innerDescriptor = new DataDescriptor({ objectdata: responseBuffer });

  const innerRef = [];
  innerRef.push({ [DataDescriptorKey.vdxfid]: innerDescriptor });

  // Create VdxfUniValue from the map
  const urlRefUniValue = new VdxfUniValue({ values: innerRef });

  const encryptedData = await encryptData(
    encryptTo,
    urlRefUniValue.toBuffer().toString('hex'), // Pass the buffer of the VdxfUniValue
    true
  );

  // Extract raw ciphertext hex — handle both string result and object result
  const ciphertextHex = typeof encryptedData === 'string' ? encryptedData : encryptedData.encryptedData;
  const epkHex = encryptedData.ephemeralPublicKey;

  // Wrap encrypted data in DataDescriptor
  const encryptedDescriptor = new DataDescriptor({
    flags: DataDescriptor.FLAG_ENCRYPTED_DATA,
    objectdata: Buffer.from(ciphertextHex, 'hex'),
    epk: Buffer.from(epkHex, 'hex'),
    // ssk: sskHex ? Buffer.from(sskHex, 'hex') : undefined,
  });

  // Build daemon-compatible JSON (raw hex values, NOT through VdxfUniValue)
  const encryptedDescriptorJson = {
    version: 1,
    flags: encryptedDescriptor.flags.toNumber(),
    objectdata: ciphertextHex,
    epk: epkHex
  };

  return {
    responseDetail: new DataDescriptorOrdinalVDXFObject({
      data: encryptedDescriptor
    }),
    encryptedDescriptorJson,
  };
};

export default {
  handleAppEncryptionRequestVDXFObject,
  processAppEncryptionRequest
};