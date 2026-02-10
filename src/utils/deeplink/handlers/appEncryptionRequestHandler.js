/*
 * appEncryptionRequestHandler.js
 * 
 * handles AppEncryptionRequest from GenericRequest envelope.
 * no UI required - processes directly and returns response.
 */

import { primitives } from "verus-typescript-primitives";
import { BN } from "bn.js";
import { CoinDirectory } from "../../CoinData/CoinDirectory";
import VrpcProvider from "../../vrpc/vrpcInterface";
import { getIdentity } from "../../api/channels/verusid/callCreators";
import { z_getencryptionaddress } from "../../api/channels/dlight/requests/zGetEncryptionAddress";
import { encryptVerusMessage } from "../../api/channels/dlight/requests/encrypt";
import store from "../../../store";

const { 
  AppEncryptionRequestDetails,
  AppEncryptionResponseDetails,
  AppEncryptionRequestOrdinalVDXFObject,
  AppEncryptionResponseOrdinalVDXFObject,
  DataDescriptor,
  DataDescriptorOrdinalVDXFObject,
  SaplingPaymentAddress,
  SaplingExtendedViewingKey,
  SaplingExtendedSpendingKey
} = primitives;


// handleAppEncryptionRequestVDXFObject
// entry point called from GenericRequestHome

/**
 * @param {GenericRequest} request - the parent GenericRequest
 * @param {GenericResponse} response - the response being built
 * @param {number} detailIndex - index of this detail in request.details
 * @returns {Promise<{ response: GenericResponse, handledIndices: number[] }>}
 */
export const handleAppEncryptionRequestVDXFObject = async (request, response, detailIndex) => {

  // get activeAccount from redux store
  // this contains wallet addresses and accountHash for seed retrieval
  const activeAccount = store.getState().authentication.activeAccount;
  
  if (!activeAccount) {
    throw new Error("no active account found");
  }
  
  // responseSignerID comes from the response signature
  // this is the identity that will create/sign the response
  if (!response.signature || !response.signature.identityID) {
    throw new Error("response signature with identityID is required");
  }
  
  const responseSignerID = response.signature.identityID.toIAddress();
  
  // extract detail
  const detail = request.getDetails(detailIndex);
  
  if (!detail || !(detail instanceof AppEncryptionRequestOrdinalVDXFObject)) {
    throw new Error("Invalid AppEncryptionRequest detail");
  }
  
  const encryptionRequest = detail.data;
  
  // extract envelope-level info
  const systemID = request.signature.systemID.toIAddress();
  const requestSignerID = request.signature.identityID.toIAddress();
  const appOrDelegatedID = getAppOrDelegatedID(request);
  
  // initialize VRPC
  const coinObj = CoinDirectory.getBasicCoinObj(systemID);
  VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);
  
  // process the request - returns the appropriate VDXF object
  const responseDetail = await processAppEncryptionRequest({
    request: encryptionRequest,
    systemID: coinObj.system_id,
    requestSignerID,
    appOrDelegatedID,
    responseSignerID,
    activeAccount
  });
  
  // add to response
  response.details = response.details || [];
  response.details.push(responseDetail);
  
  return {
    response,
    handledIndices: [detailIndex]
  };
};


// getAppOrDelegatedID
// extracts appOrDelegatedID from envelope level

const getAppOrDelegatedID = (request) => {
  if (request.hasAppOrDelegatedID && request.hasAppOrDelegatedID()) {
    return request.appordelegatedid?.toIAddress?.() 
      || request.appordelegatedid?.getAddressString?.()
      || null;
  }
  return null;
};


// getAccountAddresses
// extracts wallet addresses from activeAccount

const getAccountAddresses = (activeAccount) => {
  if (!activeAccount) return [];
  
  if (activeAccount.keys && Array.isArray(activeAccount.keys)) {
    return activeAccount.keys.map(k => k.address).filter(Boolean);
  }
  
  if (activeAccount.addresses && Array.isArray(activeAccount.addresses)) {
    return activeAccount.addresses;
  }
  
  return [];
};


// validateResponseSignerID
// validates that responseSignerID is controlled by this wallet

const validateResponseSignerID = async (responseSignerID, systemID, activeAccount) => {
  if (!responseSignerID) {
    return { valid: false, error: "responseSignerID is required" };
  }

  const accountAddresses = getAccountAddresses(activeAccount);
  
  if (accountAddresses.length === 0) {
    return { valid: false, error: "no wallet addresses available for validation" };
  }

  try {
    // fetch identity from chain to verify it exists and get primaryaddresses
    const identityResult = await getIdentity(systemID, responseSignerID);
    
    if (identityResult.error) {
      return { 
        valid: false, 
        error: `failed to fetch identity: ${identityResult.error.message}` 
      };
    }

    const identity = identityResult.result;
    
    if (!identity) {
      return { valid: false, error: `identity ${responseSignerID} not found` };
    }

    // check if wallet controls this identity
    const identityAddresses = identity.primaryaddresses || [];
    const walletControlsIdentity = identityAddresses.some(addr => 
      accountAddresses.includes(addr)
    );

    if (!walletControlsIdentity) {
      return { 
        valid: false, 
        error: `identity ${responseSignerID} is not controlled by this wallet` 
      };
    }

    // get ESK from activeAccount
    const extendedSpendingKey = activeAccount.extendedSpendingKey 
      || activeAccount.esk
      || activeAccount.keys?.[0]?.extendedSpendingKey;

    return { 
      valid: true, 
      identity,
      zAddress: identity.privateaddress, 
      fullyQualifiedName: identity.fullyqualifiedname,
      extendedSpendingKey
    };

  } catch (error) {
    return { 
      valid: false, 
      error: `validation failed: ${error.message}` 
    };
  }
};


// shouldReturnExtendedSpendingKey
// checks if app is requesting spending key (flag & 4)

const shouldReturnExtendedSpendingKey = (request) => {
  if (!request.flags) return false;
  const eskFlag = AppEncryptionRequestDetails?.RETURN_ESK || new BN(4);
  return request.flags.and(eskFlag).gt(new BN(0));
};


// hasEncryptResponseToAddress
// checks if request has encryptResponseToAddress
// supports both hasEncryptResponseToAddress method and direct property check

const hasEncryptResponseToAddress = (request) => {
  // check for hasEncryptResponseToAddress method
  if (typeof request.hasEncryptResponseToAddress === 'function') {
    return request.hasEncryptResponseToAddress();
  }
  
  // fallback to checking if encryptResponseToAddress exists and is not empty
  if (request.encryptResponseToAddress) {
    return true;
  }
  
  return false;
};


// getEncryptResponseToAddress
// gets the z-address to encrypt response to

const getEncryptResponseToAddress = (request) => {
  if (!hasEncryptResponseToAddress(request)) {
    return null;
  }
  
  // handle different formats the address might come in
  if (typeof request.encryptResponseToAddress === 'string') {
    return request.encryptResponseToAddress;
  }
  
  if (request.encryptResponseToAddress?.toAddressString) {
    return request.encryptResponseToAddress.toAddressString();
  }
  
  return request.encryptResponseToAddress;
};


// processAppEncryptionRequest
// main processing logic - derives keys and returns appropriate response object

const processAppEncryptionRequest = async ({
  request,
  systemID,
  requestSignerID,
  appOrDelegatedID,
  responseSignerID,
  activeAccount
}) => {
  
  // validate responseSignerID
  const responseSignerValidation = await validateResponseSignerID(
    responseSignerID,
    systemID,
    activeAccount
  );

  if (!responseSignerValidation.valid) {
    throw new Error(responseSignerValidation.error);
  }

  // this is used as the seed for deriving channel encryption keys
  const extendedSpendingKey = responseSignerValidation.extendedSpendingKey;
  
  if (!extendedSpendingKey) {
    throw new Error("identity does not have an extended spending key");
  }

  // appOrDelegatedID validation is done at envelope level before handler is called
  // use appOrDelegatedID if present, otherwise use requestSignerID
  const appID = appOrDelegatedID || requestSignerID;

  // check if spending key requested
  const returnEsk = shouldReturnExtendedSpendingKey(request);

  // derive channel keys
  const derivationParams = {
    spendingKey: extendedSpendingKey,
    fromId: responseSignerID,
    toId: appID,
    hdIndex: request.derivationNumber?.toNumber?.() || request.derivationNumber || 0,
    encryptionIndex: request.derivationID 
      ? (typeof request.derivationID.toNumber === "function" 
          ? request.derivationID.toNumber() 
          : 0)
      : 0,
    returnSecret: returnEsk
  };

  const derivationResult = await z_getencryptionaddress(systemID, derivationParams);

  if (derivationResult.err) {
    throw new Error("key derivation failed");
  }

  const keys = derivationResult.result;

  // build response details using constructor (not fromJson)
  // keys.ivk, keys.fvk, keys.address, keys.spending_key are all strings
  const responseDetails = new AppEncryptionResponseDetails({
    version: new BN(1),
    incomingViewingKey: Buffer.from(keys.ivk, 'hex'),
    extendedViewingKey: SaplingExtendedViewingKey.fromKeyString(keys.fvk),
    address: SaplingPaymentAddress.fromAddressString(keys.address),
    extendedSpendingKey: returnEsk 
      ? SaplingExtendedSpendingKey.fromKeyString(keys.spending_key) 
      : undefined
  });

  // check if we need to encrypt the response
  const encryptTo = getEncryptResponseToAddress(request);

  if (!encryptTo) {
    // no encryption - return AppEncryptionResponseOrdinalVDXFObject
    return new AppEncryptionResponseOrdinalVDXFObject({
      data: responseDetails
    });
  }

  // encrypt response to app's z-address
  // serialize responseDetails to hex for encryption
  const responseBuffer = responseDetails.toBuffer();
  const responseHex = responseBuffer.toString("hex");

  const encryptResult = await encryptVerusMessage(
    systemID,
    encryptTo, 
    responseHex, 
    true  
  );

  if (encryptResult.err) {
    throw new Error("encryption failed");
  }

  // encrypted response - return DataDescriptorOrdinalVDXFObject
  // wrap encrypted data in DataDescriptor with FLAG_ENCRYPTED_DATA
  const encryptedDescriptor = new DataDescriptor({
    flags: DataDescriptor.FLAG_ENCRYPTED_DATA,
    objectdata: Buffer.from(encryptResult.result, 'hex')
  });

  return new DataDescriptorOrdinalVDXFObject({
    data: encryptedDescriptor
  });
};


export default {
  handleAppEncryptionRequestVDXFObject
};