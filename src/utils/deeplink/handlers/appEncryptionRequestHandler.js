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
  GenericRequest,
  GenericResponse,
  AppEncryptionRequestDetails,
  AppEncryptionResponseDetails,
  AppEncryptionRequestOrdinalVDXFObject,
  AppEncryptionResponseOrdinalVDXFObject
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
  
  // process the request
  const encryptedResponse = await processAppEncryptionRequest({
    request: encryptionRequest,
    systemID: coinObj.system_id,
    requestSignerID,
    appOrDelegatedID,
    responseSignerID,
    activeAccount
  });
  
  // create response detail
  const responseDetail = new AppEncryptionResponseOrdinalVDXFObject({
    data: encryptedResponse
  });
  
  // add to response
  response.details = response.details || [];
  response.details.push(responseDetail);
  
  return {
    // no display prop changes needed
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


// isIdentityInWallet
// checks if identity's primaryaddresses overlap with wallet addresses

const isIdentityInWallet = async (identityID, systemID, accountAddresses) => {
  if (!identityID || !accountAddresses || accountAddresses.length === 0) {
    return false;
  }

  try {
    const identityResult = await getIdentity(systemID, identityID);
    
    if (identityResult.error || !identityResult.result) {
      return false;
    }

    const identity = identityResult.result;
    const identityAddresses = identity.primaryaddresses || [];
    
    return identityAddresses.some(addr => accountAddresses.includes(addr));
  } catch (error) {
    return false;
  }
};


// validateRequestIdentities
// validates relationship between requestSignerID and appOrDelegatedID
//
// rules:
//   - if requestSignerID is in wallet: appOrDelegatedID can be different
//   - if requestSignerID is NOT in wallet: appOrDelegatedID must equal requestSignerID or be absent

const validateRequestIdentities = async (requestSignerID, appOrDelegatedID, systemID, activeAccount) => {
  const accountAddresses = getAccountAddresses(activeAccount);
  const requestSignerInWallet = await isIdentityInWallet(requestSignerID, systemID, accountAddresses);
  
  if (requestSignerInWallet) {
    // user signed - appOrDelegatedID can be different
    return { valid: true, appID: appOrDelegatedID || requestSignerID };
  } else {
    // remote app signed - appOrDelegatedID must match requestSignerID or be absent
    if (!appOrDelegatedID || appOrDelegatedID === requestSignerID) {
      return { valid: true, appID: requestSignerID };
    } else {
      return { 
        valid: false, 
        error: "appOrDelegatedID must match requestSignerID for remote requests" 
      };
    }
  }
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
  return request.flags.and(eskFlag).get(new BN(0));
};


// processAppEncryptionRequest
// main processing logic - derives keys and encrypts response

const processAppEncryptionRequest = async ({
  // no requestIndex needed here GenericRequestHome handles index tracking 
  // it passes detailIndex and expects handledIndices back
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

  // validate request identities
  const identityValidation = await validateRequestIdentities(
    requestSignerID, 
    appOrDelegatedID, 
    systemID, 
    activeAccount
  );

  if (!identityValidation.valid) {
    throw new Error(identityValidation.error);
  }

  const appID = identityValidation.appID;

  // check if spending key requested
  const returnEsk = shouldReturnExtendedSpendingKey(request);

  // derive channel keys
  const derivationParams = {
    seed: extendedSpendingKey,
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
    throw new Error(`key derivation failed`);
  }

  const keys = derivationResult.result;

  // build response details
  const responseDetails = AppEncryptionResponseDetails.fromJson({
    version: 1,
    flags: 0,
    incomingviewingkey: keys.ivk,
    extendedviewingkey: keys.fvk,
    address: keys.address,
    extendedspendingkey: returnEsk ? keys.spending_key : undefined
  });

  const responseBuffer = responseDetails.toBuffer();
    
  const responseHex = responseBuffer.toString("hex");

  // encrypt response to app's z-address
  const encryptTo = request.encryptToZAddress;

  if (!encryptTo) {
    // if encryptTo address is empty just return the unencrypted result
   return responseHex;
  }

// if request.encryptoAdresss is empty we do not need to encrypt the reponse 

  const encryptResult = await encryptVerusMessage(
      systemID,
      encryptTo, 
      responseHex, 
      true  
  );

   if (encryptResult.err) {
    throw new Error(`encryption failed: ${encryptResult.result}`);
  }

      // return encryptedResponse directly
      // this is what gets pushed to GenericResponse
      return encryptResult.result;
};

export default {
  handleAppEncryptionRequestVDXFObject
};

