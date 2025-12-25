/*
 * appEncryptionHandler.js
 * 
 * handles the AppEncryptionRequest deeplink flow for verus mobile. when an external
 * app wants to establish an encrypted communication channel with a user, it sends 
 * an AppEncryptionRequest via deeplink.
 */

import { primitives } from 'verus-typescript-primitives';
import { BN } from 'bn.js';
import { z_getencryptionaddress } from '../../../utils/api/channels/dlight/requests/zGetEncryptionAddress';
import { encryptVerusMessage } from '../../../utils/api/channels/dlight/requests/encrypt';
import { requestSeeds } from '../../../utils/auth/authBox';
import { 
  APP_ENCRYPTION_REQUEST_INFO,
  APP_ENCRYPTION_RESPONSE_VDXF_KEY 
} from '../../../utils/constants/deeplink';
import VrpcProvider from '../../../utils/vrpc/vrpcInterface';
import { getIdentity } from '../../../utils/api/channels/verusid/callCreators';
import { convertFqnToDisplayFormat } from '../../../utils/fullyqualifiedname';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';

const { 
  AppEncryptionRequestDetails, 
  AppEncryptionResponseDetails
} = primitives;


// getAppOrDelegatedID
// extracts and returns the appOrDelegatedID from context (envelope level) or request

const getAppOrDelegatedID = (requestData, context = {}) => {
  if (context.appOrDelegatedID) {
    return context.appOrDelegatedID;
  }
  
  if (requestData.appOrDelegatedID) {
    return requestData.appOrDelegatedID.toString?.() || requestData.appOrDelegatedID;
  }
  
  return null;
};


// getRequestID
// extracts and returns the requestID from context (envelope level) or request

const getRequestID = (requestData, context = {}) => {
  if (context.requestID) {
    return context.requestID;
  }
  
  if (requestData.requestID) {
    return requestData.requestID;
  }
  
  return null;
};


// parseAppEncryptionRequest
// takes the raw json data from the deeplink and converts it into a proper
// AppEncryptionRequestDetails object

export const parseAppEncryptionRequest = (deeplinkData) => {
  try {
    if (deeplinkData.encryptToZAddress && deeplinkData.derivationNumber) {
      return deeplinkData;
    }
    
    const request = AppEncryptionRequestDetails.fromJson(deeplinkData);
    
    if (!request.isValid()) {
      throw new Error('invalid AppEncryptionRequest: missing required fields');
    }
    
    return request;
  } catch (error) {
    console.error('failed to parse AppEncryptionRequest:', error);
    throw new Error(`failed to parse encryption request: ${error.message}`);
  }
};


// shouldReturnExtendedSpendingKey
// checks if the app is requesting the extended spending key (ESK)

export const shouldReturnExtendedSpendingKey = (request) => {
  if (!request.flags) return false;
  const eskFlag = AppEncryptionRequestDetails?.RETURN_ESK || new BN(4);
  return request.flags.and(eskFlag).gt(new BN(0));
};


// getRequestDisplayInfo
// extracts the relevant info from the request for displaying to the user

export const getRequestDisplayInfo = (request, context = {}) => {
  const returnEsk = shouldReturnExtendedSpendingKey(request);
  const appOrDelegatedID = getAppOrDelegatedID(request, context);

  return {
    appOrDelegatedID: appOrDelegatedID || 'Unknown App',
    derivationNumber: request.derivationNumber?.toNumber?.() || request.derivationNumber || 0,
    derivationID: request.derivationID?.toString?.() || request.derivationID || null,
    requestID: getRequestID(request, context),
    encryptToZAddress: request.encryptToZAddress,
    requestsSpendingKey: returnEsk,
    warning: returnEsk 
      ? 'this app is requesting spending key access. only approve if you trust this application.'
      : null
  };
};


// extractCallbackUri 
// extracts callback from envelope level or passthrough

const extractCallbackUri = (context) => {
  const { envelopeCallback, passthrough, deeplinkUrl } = context;
  
  if (envelopeCallback) {
    return envelopeCallback;
  }
  
  if (passthrough?.redirectUri) return passthrough.redirectUri;
  if (passthrough?.redirect_uri) return passthrough.redirect_uri;
  if (passthrough?.callback) return passthrough.callback;

  if (deeplinkUrl) {
    try {
      const url = new URL(deeplinkUrl);
      return url.searchParams.get('redirect_uri')
        || url.searchParams.get('redirectUri')
        || url.searchParams.get('callback');
    } catch (e) {
      console.log('could not parse callback from url:', e.message);
    }
  }

  return null;
};


// resolveIdentityName 
// takes an identity address and resolves it to a friendly display name

const resolveIdentityName = async (systemId, identityAddress) => {
  try {
    const identity = await getIdentity(systemId, identityAddress);
    if (!identity.error && identity.result?.fullyqualifiedname) {
      return convertFqnToDisplayFormat(identity.result.fullyqualifiedname);
    }
  } catch (e) {
    console.log('could not resolve identity name:', e.message);
  }
  return identityAddress;
};


// processAppEncryptionRequest
// called from DeepLink.js to prepare the request for display

export const processAppEncryptionRequest = async (requestData, context) => {
  const { passthrough, deeplinkUrl, activeAccount } = context;

  const encryptionRequest = parseAppEncryptionRequest(requestData);
  const displayInfo = getRequestDisplayInfo(encryptionRequest, context);

  const isTestnet = context.isTestnet || false;
  const coinObj = CoinDirectory.findCoinObj('VRSC', null, true);

  VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);

  const callbackUri = extractCallbackUri(context);

  const appIdentityName = await resolveIdentityName(
    coinObj.system_id, 
    displayInfo.appOrDelegatedID
  );

  return {
    screenKey: APP_ENCRYPTION_REQUEST_INFO,
    displayProps: {
      deeplinkData: requestData,
      encryptionRequest,
      displayInfo: {
        ...displayInfo,
        appOrDelegatedID: appIdentityName
      },
      coinObj,
      redirectUri: callbackUri,
      passthrough,
      activeAccount,
      encryptResponseTo: context.encryptResponseTo || null,
      requestId: getRequestID(encryptionRequest, context),
      isTestnet
    }
  };
};



// isIdentityInWallet
// checks if an identity is controlled by the current wallet

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
    console.error('isIdentityInWallet check failed:', error);
    return false;
  }
};


// validateRequestIdentities
// validates the relationship between requestSignerID and appOrDelegatedID
// 
// rules:
//   - if requestSignerID is in wallet: appOrDelegatedID can be different from requestSignerID
//   - if requestSignerID is NOT in wallet: appOrDelegatedID must equal requestSignerID or be absent

const validateRequestIdentities = async (requestSignerID, appOrDelegatedID, systemID, activeAccount) => {
  const accountAddresses = getAccountAddresses(activeAccount);
  
  const requestSignerInWallet = await isIdentityInWallet(requestSignerID, systemID, accountAddresses);
  
  if (requestSignerInWallet) {
    // user signed - appOrDelegatedID can be different from requestSignerID
    return { valid: true, appID: appOrDelegatedID || requestSignerID };
  } else {
    // remote app signed - appOrDelegatedID must match requestSignerID or be absent
    if (!appOrDelegatedID || appOrDelegatedID === requestSignerID) {
      return { valid: true, appID: requestSignerID };
    } else {
      return { 
        valid: false, 
        error: 'appOrDelegatedID must match requestSignerID for remote requests' 
      };
    }
  }
};


// validateResponseSignerID
// validates that the responseSignerID is an identity controlled by this wallet

export const validateResponseSignerID = async (responseSignerID, systemID, activeAccount) => {
  if (!responseSignerID) {
    return { valid: false, error: 'responseSignerID is required' };
  }

  const accountAddresses = getAccountAddresses(activeAccount);
  
  if (accountAddresses.length === 0) {
    return { valid: false, error: 'no wallet addresses available for validation' };
  }

  try {
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

    const zAddress = identity.privateaddress || null;

    return { 
      valid: true, 
      identity,
      zAddress,
      fullyQualifiedName: identity.fullyqualifiedname
    };

  } catch (error) {
    return { 
      valid: false, 
      error: `validation failed: ${error.message}` 
    };
  }
};


// handleAppEncryptionRequest
// processes an AppEncryptionRequest and adds the response to the response array

export const handleAppEncryptionRequest = async ({
  request,
  requestIndex,
  systemID,
  requestSignerID,
  appOrDelegatedID,
  response,
  responseSignerID,
  activeAccount
}) => {
  console.log('=== processing AppEncryptionRequest ===');
  
  // validate responseSignerID (must be logged-in identity in wallet)
  const responseSignerValidation = await validateResponseSignerID(
    responseSignerID,
    systemID,
    activeAccount
  );

  // validate request identities
  const identityValidation = await validateRequestIdentities(
    requestSignerID, 
    appOrDelegatedID, 
    systemID, 
    activeAccount
  );

  if (!identityValidation.valid) {
    console.error('identity validation failed:', identityValidation.error);
    response.push({
      requestIndex,
      success: false,
      error: identityValidation.error
    });
    return { success: false, error: identityValidation.error };
  }

  const appID = identityValidation.appID;
  console.log('identity validation passed, appID:', appID);

  // retrieve master seed
  let masterSeed;
  try {
    const accountHash = activeAccount.accountHash;
    const seeds = await requestSeeds(null, [accountHash]);
    masterSeed = seeds[accountHash];
    
    if (!masterSeed) {
      throw new Error('failed to retrieve master seed');
    }
  } catch (error) {
    console.error('seed retrieval failed:', error);
    response.push({
      requestIndex,
      success: false,
      error: `seed retrieval failed: ${error.message}`
    });
    return { success: false, error: error.message };
  }

  // check if spending key is requested
  const returnEsk = shouldReturnExtendedSpendingKey(request);

  // derive channel keys
  const derivationParams = {
    seed: masterSeed,
    fromId: responseSignerID,
    toId: appID,
    hdIndex: request.derivationNumber?.toNumber?.() || request.derivationNumber || 0,
    encryptionIndex: request.derivationID 
      ? (typeof request.derivationID.toNumber === 'function' 
          ? request.derivationID.toNumber() 
          : 0)
      : 0,
    returnSecret: returnEsk
  };

  console.log('derivation params:', {
    fromId: derivationParams.fromId,
    toId: derivationParams.toId,
    hdIndex: derivationParams.hdIndex,
    encryptionIndex: derivationParams.encryptionIndex,
    returnSecret: derivationParams.returnSecret
  });

  let keys;
  try {
    const derivationResult = await z_getencryptionaddress(systemID, derivationParams);
    
    if (derivationResult.err) {
      throw new Error(`key derivation failed: ${derivationResult.result}`);
    }
    
    keys = derivationResult.result;
    
    console.log('key derivation successful:', {
      hasAddress: !!keys.address,
      hasFvk: !!keys.fvk,
      hasIvk: !!keys.ivk,
      hasSpendingKey: !!keys.spending_key
    });
  } catch (error) {
    console.error('key derivation failed:', error);
    response.push({
      requestIndex,
      success: false,
      error: `key derivation failed: ${error.message}`
    });
    return { success: false, error: error.message };
  }

  // build the response details
  const requestID = request.requestID || null;

  const responseDetails = AppEncryptionResponseDetails.fromJson({
    version: 1,
    flags: requestID ? 1 : 0,
    requestid: requestID || undefined,
    incomingviewingkey: keys.ivk,
    extendedviewingkey: keys.fvk,
    address: keys.address,
    extendedspendingkey: returnEsk ? keys.spending_key : undefined
  });

  const responseBuffer = responseDetails.toBuffer();
  const responseHex = responseBuffer.toString('hex');

  // encrypt the response
  const encryptTo = request.encryptToZAddress;

  if (!encryptTo) {
    const error = 'no encryption address available in request';
    console.error(error);
    response.push({
      requestIndex,
      success: false,
      error
    });
    return { success: false, error };
  }

  let encryptedResponse;
  try {
    const encryptResult = await encryptVerusMessage(
      systemID,
      encryptTo,
      responseHex,
      false
    );

    if (encryptResult.err) {
      throw new Error(`encryption failed: ${encryptResult.result}`);
    }

    encryptedResponse = encryptResult.result;
  } catch (error) {
    console.error('encryption failed:', error);
    response.push({
      requestIndex,
      success: false,
      error: `encryption failed: ${error.message}`
    });
    return { success: false, error: error.message };
  }

  // add response to array
  response.push({
    success: true,
    encryptedData: encryptedResponse
  });

  console.log('=== AppEncryptionRequest processing complete ===');

  return { success: true };
};


// formatCallbackUrl
// builds the callback url with the encrypted response

export const formatCallbackUrl = (redirectUri, result, status = 'success') => {
  if (!redirectUri) return null;

  try {
    const url = new URL(redirectUri);
    
    url.searchParams.set('status', status);
    url.searchParams.set('id', result.responseVdxfId || '');
    
    if (result.requestID) {
      url.searchParams.set('requestId', result.requestID);
    }
    
    if (status === 'success' && result.encryptedResponse) {
      const encodedResponse = Buffer.from(JSON.stringify(result.encryptedResponse)).toString('base64');
      url.searchParams.set('response', encodedResponse);
    }

    return url.toString();
  } catch (e) {
    console.error('error formatting callback url:', e);
    return redirectUri;
  }
};


export default {
  parseAppEncryptionRequest,
  getRequestDisplayInfo,
  shouldReturnExtendedSpendingKey,
  processAppEncryptionRequest,
  handleAppEncryptionRequest,
  validateResponseSignerID,
  formatCallbackUrl,
  getAppOrDelegatedID,
  getRequestID
};