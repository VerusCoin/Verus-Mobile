/*
 * appEncryptionRequestHandler.js
 * 
 * Handles AppEncryptionRequest from GenericRequest envelope.
 * No UI required - processes directly and returns response.
 */

import { 
  AppEncryptionResponseDetails,
  AppEncryptionRequestOrdinalVDXFObject,
  AppEncryptionResponseOrdinalVDXFObject,
  SaplingPaymentAddress,
  DataDescriptor,
  DataDescriptorOrdinalVDXFObject
} from "verus-typescript-primitives";

import { SaplingExtendedViewingKey } from "verus-typescript-primitives/dist/pbaas/SaplingExtendedViewingKey";
import { SaplingExtendedSpendingKey } from "verus-typescript-primitives/dist/pbaas/SaplingExtendedSpendingKey";

import { BN } from "bn.js";
import { CoinDirectory } from "../../CoinData/CoinDirectory";
import VrpcProvider from "../../vrpc/vrpcInterface";
import store from "../../../store";

import { requestPrivKey } from "../../auth/authBox";
import { DLIGHT_PRIVATE } from "../../constants/intervalConstants";
import { getAppOrDelegatedID } from "../helper/getAppOrDelegatedIDhelper";

import { z_getencryptionaddress } from "../../api/channels/dlight/requests/zGetEncryptionAddress";
import { encrypt_verus_data } from "../../api/channels/dlight/requests/encrypt";


// Configuration

// Set to false when real z_functions are available
const USE_MOCK_Z_FUNCTIONS = true;


/**
 * Gets the Extended Spending Key from the wallet
 * @param {string} systemID - The system ID (VRSC or VRSCTEST)
 * @returns {Promise<string>} The ESK
 * @throws {Error} If ESK cannot be retrieved
 */
const getExtendedSpendingKey = async (systemID) => {
  const coinId = CoinDirectory.getBasicCoinObj(systemID);
  try {
    const esk = await requestPrivKey(coinId.id, DLIGHT_PRIVATE);
    
    if (!esk) {
      throw new Error(`extended spending key not available for ${coinId}`);
    }
    
    return esk;
  } catch (e) {
    throw new Error(`failed to retrieve extended spending key: ${e.message}`);
  }
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

const mock_encryptverusdata = async (systemID, toAddress, data, returnSsk) => {
  return {
    err: false,
    result: data
  };
};



const callZGetEncryptionAddress = async (systemID, params) => {
  if (USE_MOCK_Z_FUNCTIONS) {
    return mock_z_getencryptionaddress(systemID, params);
  }

    return z_getencryptionaddress(systemID, params);
};

const callEncryptVerusData = async (systemID, toAddress, data, returnSsk) => {
  if (USE_MOCK_Z_FUNCTIONS) {
    return mock_encryptverusdata(systemID, toAddress, data, returnSsk);
  }

  return encrypt_verus_data(systemID, toAddress, data, returnSsk);
};


/**
 * Entry point called from GenericRequestHome
 * @param {GenericRequest} request - The parent GenericRequest
 * @param {GenericResponse} response - The response being built
 * @param {number} detailIndex - Index of this detail in request.details
 * @returns {Promise<{ response: GenericResponse, handledIndices: number[] }>}
 * @throws {Error} If processing fails
 */
export const handleAppEncryptionRequestVDXFObject = async (request, response, detailIndex) => {
  const activeAccount = store.getState().authentication.activeAccount;

  if (!activeAccount) {
    throw new Error("no active account found");
  }

  if (!response.signature || !response.signature.identityID) {
    throw new Error("response signature with identityID is required");
  }

  const responseSignerID = response.signature.identityID.toIAddress();

  const detail = request.getDetails(detailIndex);
  
  if (!detail || !(detail instanceof AppEncryptionRequestOrdinalVDXFObject)) {
    throw new Error("invalid AppEncryptionRequest detail at index " + detailIndex);
  }
  
  const encryptionRequest = detail.data;
  
  const systemID = request.signature.systemID.toIAddress()
  const requestSignerID = request.signature.identityID.toIAddress();
  const appOrDelegatedID = getAppOrDelegatedID(request);

  const coinObj = CoinDirectory.getBasicCoinObj(systemID);
  
  if (!coinObj) {
    throw new Error("unsupported system: " + systemID);
  }
  
  VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);
  
  const responseDetail = await processAppEncryptionRequest({
    request: encryptionRequest,
    systemID: coinObj.system_id,
    requestSignerID,
    appOrDelegatedID,
    responseSignerID,
  });

  response.details = response.details || [];
  response.details.push(responseDetail);

  return {
    response,
    handledIndices: [detailIndex]
  };
};



/**
 * Derives keys and builds the response object
 * @param {Object} params
 * @returns {Promise<AppEncryptionResponseOrdinalVDXFObject|DataDescriptorOrdinalVDXFObject>}
 * @throws {Error} If processing fails
 */
const processAppEncryptionRequest = async ({
  request,
  systemID,
  requestSignerID,
  appOrDelegatedID,
  responseSignerID,
}) => {
  
  // Get ESK for key derivation
  const eskForDerivation = await getExtendedSpendingKey(systemID);

  // Use appOrDelegatedID if present, otherwise use requestSignerID
  const appID = appOrDelegatedID || requestSignerID;


  // Check if spending key requested via flags
  const returnESK = request.returnESK();

  // Build derivation params
  const derivationParams = {
    extsk: eskForDerivation,
    fromId: responseSignerID,
    toId: appID,
    encryptionIndex: request.derivationNumber.toNumber(),
    returnSecret: returnESK
  };

  // Derive channel keys
  const derivationResult = await callZGetEncryptionAddress(systemID, derivationParams); 

  if (derivationResult.err) {
    throw new Error("key derivation failed");
  }

  const keys = derivationResult.result;

  // Build response details
  let responseDetails;

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
      flags: new BN(0),
      incomingViewingKey: Buffer.alloc(32).fill(0xaa),
      extendedViewingKey: mockFvk,
      address: mockAddress,
    });
  } else {
    // Real mode: parse actual keys from z_getencryptionaddress
    if (!keys.ivk || !keys.extfvk || !keys.address) {
      throw new Error("incomplete key derivation result");
    }

    if (returnESK && !keys.spendingKey) {
      throw new Error("spending key requested but not returned");
    }

    responseDetails = new AppEncryptionResponseDetails({
      version: new BN(1),
      incomingViewingKey: keys.ivk, 
      extendedViewingKey: keys.extfvk,
      address: keys.address,
      extendedSpendingKey: returnESK
        ? SaplingExtendedSpendingKey.fromKeyString(keys.spending_key) : undefined
    });
    
  }
  console.log ("Resonse", responseDetails);
  // get the encrypt to address or return null as its optional
  const encryptTo = request.hasEncryptResponseToAddress() 
  ? request.encryptResponseToAddress
  : null;

  if (!encryptTo) {
    // Return unencrypted response
    return new AppEncryptionResponseOrdinalVDXFObject({
      data: responseDetails
    });
  }

  // Encrypt response
  const responseBuffer = responseDetails.toBuffer();

  const encryptResult = await callEncryptVerusData(
    systemID,
    encryptTo,
    responseBuffer,
    true
  );

  if (encryptResult.err) {
    throw new Error("encryption failed");
  }
  const encryptedData = encryptResult.result;

  // Wrap encrypted data in DataDescriptor
  const encryptedDescriptor = new DataDescriptor({
    flags: DataDescriptor.FLAG_ENCRYPTED_DATA,
    objectdata: Buffer.from(encryptedData.encryptedData, 'hex'),
    epk: Buffer.from(encryptedData.ephemeralPublicKey, 'hex'),
  });

  return new DataDescriptorOrdinalVDXFObject({
    data: encryptedDescriptor
  });
};


export default {
  handleAppEncryptionRequestVDXFObject
};


