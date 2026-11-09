/*
 * appEncryptionRequestHandler.js
 * 
 * Handles AppEncryptionRequest from GenericRequest envelope.
 * Shows user approval UI before deriving encryption keys.
 */

import {
  AppEncryptionResponseDetails,
  AppEncryptionRequestOrdinalVDXFObject,
  SaplingPaymentAddress,
  DataResponseDetails,
  DataResponseOrdinalVDXFObject,
  GenericRequest,
  GenericResponse,
  IdentityID,
} from "verus-typescript-primitives";

import { SaplingExtendedViewingKey } from "verus-typescript-primitives/dist/pbaas/SaplingExtendedViewingKey";
import { SaplingExtendedSpendingKey } from "verus-typescript-primitives/dist/pbaas/SaplingExtendedSpendingKey";

import { BN } from "bn.js";
import store from "../../../store";
import { getIdentity } from "../../api/channels/verusid/callCreators";
import { convertFqnToDisplayFormat } from "../../fullyqualifiedname";

import { zGetEncryptionAddress } from "../../api/channels/dlight/requests/zGetEncryptionAddress";
import { encryptDataBufferToDescriptor } from "../../crypto/encryptDataDescriptor";
import { getKeyMaterial, spendingKeyHex } from "../../crypto/getKeyMaterial";
import { getRequestScope, getSignedRequestDisplayProps } from "./requestDisplayUtils";
import {
  checkedNativeIndex,
  validateAppEncryptionRequestDetails,
} from "../validator/appEncryptionRequestValidator";
import { assertAppEncryptionAuthorization } from "../validator/appEncryptionAuthorization";
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from "../../../actions/actions/updates/sessionRequests";
import { assertRequestNetworkMatchesAccount } from "../requestAccounts";

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
  await validateAppEncryptionRequestDetails(request, encryptionRequest, detailIndex);

  const signer = await getSignedRequestDisplayProps(request);
  const systemID = signer.signerSystemID;
  const appScopeID = getRequestScope(request);
  let appScopeFqn = appScopeID;

  // Name lookup is display-only; an unregistered scope or nested ID is valid.
  try {
    const scopeIdentity = await getIdentity(systemID, appScopeID);
    if (scopeIdentity.result?.fullyqualifiedname) {
      appScopeFqn = convertFqnToDisplayFormat(scopeIdentity.result.fullyqualifiedname);
    }
  } catch (_) {}

  // Resolve derivationID to FQN if present
  let derivationIdFqn = null;
  if (encryptionRequest.hasDerivationID()) {
    const derivationIdAddr = encryptionRequest.derivationID.toIAddress();
    derivationIdFqn = derivationIdAddr;
    try {
      const derivationIdentity = await getIdentity(systemID, derivationIdAddr);
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
      const requestIdentity = await getIdentity(systemID, requestIdAddr);
      if (!requestIdentity.error && requestIdentity.result?.fullyqualifiedname) {
        requestIdFqn = convertFqnToDisplayFormat(requestIdentity.result.fullyqualifiedname);
      }
    } catch (_) {
      // Keep raw i-address if resolution fails
    }
  }

  const encryptResponseToAddress = encryptionRequest.encryptResponseToAddress.toAddressString();

  return {
    displayProps: {
      detailsBufferString: detail.data.toBuffer().toString('hex'),
      ...signer,
      appScopeID,
      appScopeFqn,
      derivationNumber: checkedNativeIndex(encryptionRequest.derivationNumber),
      secondaryDerivationNumber: encryptionRequest.hasDerivationID()
        ? checkedNativeIndex(encryptionRequest.secondaryDerivationNumber, "secondary derivation number")
        : null,
      derivationIdFqn,
      derivationIdentityID: encryptionRequest.hasDerivationID()
        ? encryptionRequest.derivationID.toIAddress()
        : null,
      hasDerivationID: encryptionRequest.hasDerivationID(),
      requestIdFqn,
      hasRequestID: encryptionRequest.hasRequestID(),
      encryptResponseToAddress,
      returnESK: encryptionRequest.returnESK(),
    },
    response,
    handledIndices: []
  };
};

// ============================================================================
// Processing Function - Called after user approval
// ============================================================================

export const buildEncryptedAppEncryptionResponseDetail = (
  encryptionRequest,
  encryptedDescriptor,
) => new DataResponseOrdinalVDXFObject({
  data: new DataResponseDetails({
    requestID: encryptionRequest.hasRequestID() ? encryptionRequest.requestID : undefined,
    data: encryptedDescriptor,
  })
});

/**
 * Derives keys and builds the response object.
 * Called by AppEncryptionRequestInfo after user approval.
 * 
 * @param {Object} params
 * @param {GenericRequest} params.request - The parent GenericRequest
 * @param {number} params.detailIndex - Index of the encryption request detail
 * @param {string} params.responseSignerID - The user's signing identity i-address
 * @param {string} params.responseSignerSystemID - The selected identity's signing chain
 * @param {Function} params.assertActive - Checks that the reviewed request and identity are still selected
 * @returns {Promise<{responseDetail: DataResponseOrdinalVDXFObject, encryptedDescriptorJson: object}>}
 * @throws {Error} If processing fails
 */
export const processAppEncryptionRequest = async ({
  request,
  detailIndex,
  responseSignerID,
  responseSignerSystemID,
  assertActive,
}) => {
  const detail = request.getDetails(detailIndex);

  if (!detail || !(detail instanceof AppEncryptionRequestOrdinalVDXFObject)) {
    throw new Error("Invalid AppEncryptionRequest detail at index " + detailIndex);
  }

  const encryptionRequest = detail.data;
  await validateAppEncryptionRequestDetails(request, encryptionRequest, detailIndex);

  const state = store.getState();
  const sessionScope = captureSessionScope(state);
  const approvedRequest = request.toBuffer().toString('hex');
  const network = JSON.stringify(state.authentication.activeAccount?.testnetOverrides || {});
  const assertCurrent = () => {
    const current = store.getState();
    if (
      !sessionScopeIsCurrent(current, sessionScope) ||
      network !== JSON.stringify(current.authentication.activeAccount?.testnetOverrides || {}) ||
      approvedRequest !== request.toBuffer().toString('hex')
    ) {
      throw Object.assign(
        new Error("Encryption approval changed. Review the request again."),
        {code: 'SESSION_CHANGED'},
      );
    }

    assertRequestNetworkMatchesAccount(current.authentication.activeAccount, request.isTestnet());
    assertActive();
  };

  assertCurrent();
  // Reverify the signature and both signing authorities at the approval boundary.
  const { coinObj, appScopeID } = await assertAppEncryptionAuthorization(
    request,
    {identityID: responseSignerID, systemID: responseSignerSystemID},
    {sessionScope, assertActive: assertCurrent},
  );
  assertCurrent();

  const nested = encryptionRequest.hasDerivationID();
  const returnESK = encryptionRequest.returnESK();
  const fromId = IdentityID.fromAddress(responseSignerID).hash.toString('hex');
  const primaryIndex = checkedNativeIndex(encryptionRequest.derivationNumber);
  const secondaryIndex = nested
    ? checkedNativeIndex(encryptionRequest.secondaryDerivationNumber, "secondary derivation number")
    : null;
  const keyMaterial = await getKeyMaterial(coinObj.id, {sessionScope, assertActive: assertCurrent});
  assertCurrent();

  let keys;
  try {
    // Always establish the app scope before deriving an optional nested channel.
    keys = await zGetEncryptionAddress(coinObj.system_id, {
      ...keyMaterial,
      fromId,
      toId: IdentityID.fromAddress(appScopeID).hash.toString('hex'),
      hdIndex: -1,
      encryptionIndex: primaryIndex,
      returnSecret: nested || returnESK,
    });
    assertCurrent();

    if (nested) {
      const extsk = spendingKeyHex(keys?.spendingKey);
      keys = await zGetEncryptionAddress(coinObj.system_id, {
        extsk,
        fromId,
        toId: IdentityID.fromAddress(encryptionRequest.derivationID.toIAddress()).hash.toString('hex'),
        hdIndex: -1,
        encryptionIndex: secondaryIndex,
        returnSecret: returnESK,
      });
      assertCurrent();
    }
  } catch (error) {
    if (error?.code === 'SESSION_CHANGED') throw error;
    // Native failures must not leak input keys or return the intermediate result.
    throw new Error("Unable to derive encryption channel keys.");
  }

  // Build response details
  let responseFlags = new BN(0);

  // Set flags based on what we're returning
  if (encryptionRequest.hasRequestID()) {
    responseFlags = responseFlags.or(AppEncryptionResponseDetails.FLAG_HAS_REQUEST_ID);
  }
  if (returnESK) {
    responseFlags = responseFlags.or(AppEncryptionResponseDetails.FLAG_HAS_EXTENDED_SPENDING_KEY);
  }

  if (!keys || !/^[0-9a-f]{64}$/i.test(keys.ivk) || !keys.extfvk || !keys.address) {
    throw new Error("Incomplete key derivation result");
  }

  if (returnESK && !keys.spendingKey) {
    throw new Error("Spending key requested but not returned");
  }

  let responseDetails;
  try {
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
  } catch (_) {
    throw new Error("Invalid encryption channel keys.");
  }

  // Every final channel response is encrypted, including viewing-only responses.
  const encryptTo = encryptionRequest.encryptResponseToAddress.toAddressString();
  const { encryptedDescriptor, encryptedDescriptorJson } =
    await encryptDataBufferToDescriptor(encryptTo, responseDetails.toBuffer());
  assertCurrent();

  return {
    responseDetail: buildEncryptedAppEncryptionResponseDetail(
      encryptionRequest,
      encryptedDescriptor,
    ),
    encryptedDescriptorJson,
  };
};

export default {
  handleAppEncryptionRequestVDXFObject,
  buildEncryptedAppEncryptionResponseDetail,
  processAppEncryptionRequest
};
