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

// Configuration

// Set to false when real z_functions are available
const USE_MOCK_Z_FUNCTIONS = false;

/**
 * Gets key material for z_getencryptionaddress.
 * 
 * IMPORTANT: We prefer the raw mnemonic seed over the extsk because the
 * daemon's z_getencryptionaddress takes the raw 64-byte seed (the output of
 * SeedPhrase.new(mnemonic).toByteArray()), NOT the extended spending key.
 * Passing extsk goes through a different derivation path and produces
 * different results.
 *
 * Returns { mnemonicSeed } when possible, or { extsk } as last resort.
 * The native module converts mnemonicSeed via SeedPhrase.new() internally.
 *
 * @param {string} systemID - The system ID (VRSC or VRSCTEST)
 * @returns {Promise<{extsk?: string, mnemonicSeed?: string}>}
 * @throws {Error} If no key material can be retrieved
 */
const getKeyMaterial = async (systemID) => {
  const coinObj = CoinDirectory.getBasicCoinObj(systemID);

  // 1. Prefer raw mnemonic seed — this matches what the daemon uses.
  //    The native module will run SeedPhrase.new(mnemonic).toByteArray()
  //    to turn it into the 64-byte seed the derivation expects.
  try {
    const seeds = await requestSeeds();
    const dlightSeed = seeds[DLIGHT_PRIVATE];
    if (dlightSeed) {
      if (isDlightSpendingKey(dlightSeed)) {
        // Stored "seed" is actually an extsk (bech32 spending key).
        // Can't use it as a mnemonic — fall through to extsk path.
        console.warn('dlight seed is an extsk, cannot use as mnemonic');
      } else {
        // Raw mnemonic seed — this is what the daemon's z_getencryptionaddress expects.
        return { mnemonicSeed: dlightSeed };
      }
    }
  } catch (e) {
    console.warn('Failed to get raw seeds, trying stored keys:', e?.message);
  }

  // 2. Fallback: try stored ESK for the requested coin
  try {
    const esk = await requestPrivKey(coinObj.id, DLIGHT_PRIVATE);
    if (esk) return { extsk: esk };
  } catch (_) {}

  // 3. Fallback: try stored ESK for VRSC (same seed, network-agnostic)
  if (coinObj.id !== 'VRSC') {
    try {
      const esk = await requestPrivKey('VRSC', DLIGHT_PRIVATE);
      if (esk) return { extsk: esk };
    } catch (_) {}
  }

  throw new Error(
    `No Z (shielded address) seed has been set up. ` +
    `Please go to Settings → Profile and set up a Z Seed before accepting encryption requests.`
  );
};

// remove when tested with real functions

const mock_z_getencryptionaddress = async (systemID, params) => {
  return {
    err: false,
    result: {
      ivk: "a".repeat(64),
    }
  };
};

const mock_encryptData = async (systemID, toAddress, data, returnSsk) => {
  return {
    err: false,
    result: data
  };
};


// ============================================================================
// z_function Wrappers
// ============================================================================

const callZGetEncryptionAddress = async (systemID, params) => {
  if (USE_MOCK_Z_FUNCTIONS) {
    return mock_z_getencryptionaddress(systemID, params);
  }

    return z_getencryptionaddress(systemID, params);
};

const callEncryptData = async (systemID, toAddress, data, returnSsk) => {
  if (USE_MOCK_Z_FUNCTIONS) {
    return mock_encryptData(systemID, toAddress, data, returnSsk);
  }

    return encryptData(systemID, toAddress, data, returnSsk);
};


// ============================================================================
// Main Handler
// ============================================================================

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
  } catch (e) {
    console.warn("Unable to load signer metadata for app encryption request", e?.message ?? e);
  }

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
    } catch (e) {
      console.warn("Unable to resolve derivationID", e);
    }
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
    } catch (e) {
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
  const derivationParams = {
    ...keyMaterial,           // { extsk } or { mnemonicSeed }
    fromId: fromIdHex,
    toId: toIdHex,
    ...(keyMaterial.mnemonicSeed ? { hdIndex: 0 } : {}),
    encryptionIndex: encryptionRequest.derivationNumber.toNumber(),
    returnSecret: returnESK
  };

  // Derive channel keys
  const derivationResult = await callZGetEncryptionAddress(coinObj.system_id, derivationParams);

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
    responseFlags = responseFlags.or(new BN(1)); // FLAG_HAS_REQUEST_ID
  }
  if (returnESK) {
    responseFlags = responseFlags.or(new BN(2)); // FLAG_HAS_EXTENDED_SPENDING_KEY
  }

  if (USE_MOCK_Z_FUNCTIONS) {
    // Mock mode: create mock objects with valid buffers
    const mockAddress = new SaplingPaymentAddress();
    mockAddress.d = Buffer.alloc(11).fill(0x01);
    mockAddress.pk_d = Buffer.alloc(32).fill(0x02);

    const mockFvk = new SaplingExtendedViewingKey();
    mockFvk.depth = 0;
    mockFvk.parentFVKTag = Buffer.alloc(4);
    mockFvk.childIndex = Buffer.alloc(4);
    mockFvk.chainCode = Buffer.alloc(32);
    mockFvk.ak = Buffer.alloc(32);
    mockFvk.nk = Buffer.alloc(32);
    mockFvk.ovk = Buffer.alloc(32);
    mockFvk.dk = Buffer.alloc(32);

    responseDetails = new AppEncryptionResponseDetails({
      version: new BN(1),
      flags: responseFlags,
      incomingViewingKey: Buffer.alloc(32).fill(0xaa),
      extendedViewingKey: mockFvk,
      address: mockAddress,
      requestID: encryptionRequest.hasRequestID() ? encryptionRequest.requestID : undefined,
    });
  } else {
    // Real mode: parse actual keys from z_getencryptionaddress
    console.log("keys", {keys})
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
  }

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

  const innerDescriptor = new DataDescriptor({objectdata: responseBuffer});

  const innerRef = [];
  innerRef.push({ [DataDescriptorKey.vdxfid]: innerDescriptor });
  
  // Create VdxfUniValue from the map
  const urlRefUniValue = new VdxfUniValue({ values: innerRef });

  const encryptResult = await callEncryptData(
    coinObj.system_id,
    encryptTo,
    urlRefUniValue.toBuffer().toString('hex'), // Pass the buffer of the VdxfUniValue
    true
  );

  if (encryptResult.err) {
    throw new Error("Encryption failed: " + (encryptResult.err.message || encryptResult.err));
  }
  
  const encryptedData = encryptResult.result;

  // Extract raw ciphertext hex — handle both string result and object result
  const ciphertextHex = typeof encryptedData === 'string' ? encryptedData : encryptedData.encryptedData;
  const epkHex = encryptedData.ephemeralPublicKey;
  const sskHex = encryptedData.symmetricKey;

  

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
    epk: epkHex,
   // ...(sskHex ? { ssk: sskHex } : {}),
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


