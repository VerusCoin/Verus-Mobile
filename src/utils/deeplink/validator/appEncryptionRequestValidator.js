/*
 * appEncryptionRequestValidator.js
 * 
 * validates AppEncryptionRequest details before processing.
 * throws on any error, returns nothing on success.
 */

import { GenericRequest, AppEncryptionRequestOrdinalVDXFObject } from "verus-typescript-primitives";
import { CoinDirectory } from "../../CoinData/CoinDirectory";
import VrpcProvider from "../../vrpc/vrpcInterface";
import { getIdentity } from "../../api/channels/verusid/callCreators";


// validateAppEncryptionRequestVDXFObject
// entry point for envelope validator - validates detail at specific index

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
// validates the AppEncryptionRequestDetails object

/**
 * @param {GenericRequest} request - the parent request (for signature info)
 * @param {import("verus-typescript-primitives").AppEncryptionRequestDetails} details
 * @param {number} detailIndex
 */
export const validateAppEncryptionRequestDetails = async (request, details, detailIndex) => {
  
  // request must be signed for AppEncryption
  if (!request.isSigned()) {
    throw new Error("AppEncryptionRequest requires a signed envelope");
  }
  
  // get system from signature
  const systemID = request.signature.systemID.toIAddress();
  const coinObj = CoinDirectory.getBasicCoinObj(systemID);
  VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);
  
  // validate encryptToZAddress is present
  if (!details.encryptToZAddress) {
    throw new Error("AppEncryptionRequest must include encryptToZAddress");
  }
  
  // validate encryptToZAddress format (should be a z-address)
  if (!details.encryptToZAddress.startsWith('zs1')) {
    throw new Error("encryptToZAddress must be a valid sapling address");
  }
  
  // validate requestSignerID exists on chain
  const requestSignerID = request.signature.identityID.toIAddress();
  const signerIdentity = await getIdentity(coinObj.system_id, requestSignerID);
  
  if (signerIdentity.error) {
    throw new Error(`Failed to fetch request signer identity: ${signerIdentity.error.message}`);
  }
  
  if (!signerIdentity.result) {
    throw new Error(`Request signer identity ${requestSignerID} not found on chain`);
  }

  // if appOrDelegatedID is present at envelope level, validate it
  // we only check it EXISTS here
  // the spoofing check (does requestSignerID have permission to specify this app)
  // happens in the handler because it needs activeAccount to determine
  // if requestSignerID is in the wallet
  if (request.hasAppOrDelegatedID && request.hasAppOrDelegatedID()) {
    const appOrDelegatedID = request.appordelegatedid?.toIAddress?.() 
      || request.appordelegatedid?.getAddressString?.();
    
    if (appOrDelegatedID) {
      const appIdentity = await getIdentity(coinObj.system_id, appOrDelegatedID);
      
      if (appIdentity.error) {
        throw new Error(`Failed to fetch app identity: ${appIdentity.error.message}`);
      }
      
      if (!appIdentity.result) {
        throw new Error(`App identity ${appOrDelegatedID} not found on chain`);
      }
    }
  }
  
  // validation passed - no return value
};